import os
import json
import re
import hashlib
from datetime import datetime
from flask import Flask, render_template, request, jsonify, Response
from langdetect import detect, DetectorFactory
import tenacity
import requests
import logging

app = Flask(__name__)
BASE_DIR = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(BASE_DIR, "config", "api_config.json")

DetectorFactory.seed = 0

def load_config():
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            config = json.load(f)
    except FileNotFoundError:
        config = {}

    default_config = {
        "default_engine": "openai",
        "default_model": "",
        "engines": {
            "openai": {"api_key": "", "endpoint": "https://api.openai.com/v1/chat/completions"},
            "gemini": {"api_key": "", "endpoint": "https://generativelanguage.googleapis.com/v1beta/models"},
            "openrouter": {"api_key": "", "endpoint": "https://openrouter.ai/api/v1/chat/completions"},
            "ollama": {"api_key": "", "endpoint": "http://localhost:11434/api/chat"},
            "lmstudio": {"api_key": "", "endpoint": "http://localhost:1234/v1/chat/completions"}
        },
        "saved_models": [],
        "translation_modes": {
            "default_mode": "only_translate",
            "presets": {
                "only_translate": "You are a professional translator. Translate strictly into {{TARGET_LANG}}. Keep meaning, tone, numbers, names, code. No extra commentary.",
                "prompt_translator": "Act as a prompt translator. Convert the user text into a clear, concise {{TARGET_LANG}} prompt for an AI model. Keep intent, constraints, and structure.",
                "master_translate": "You are a master literary and technical translator. Translate into natural, idiomatic {{TARGET_LANG}}; preserve style and nuance; fix minor grammar, keep formatting."
            },
            "custom_overrides": {},
            "thinking_enabled": False
        }
    }

    config = {**default_config, **config}
    config["engines"] = {**default_config["engines"], **config.get("engines", {})}
    config["engines"]["gemini"]["endpoint"] = "https://generativelanguage.googleapis.com/v1beta/models"

    if not os.path.exists(CONFIG_PATH):
        save_config(config)

    return config

def save_config(config):
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/get-config', methods=['GET'])
def get_config():
    return jsonify(load_config())

@app.route('/translation-modes', methods=['GET'])
def get_translation_modes():
    return jsonify(load_config().get("translation_modes", {}))

@app.route('/get-models', methods=['GET'])
def get_models():
    engine = request.args.get('engine')
    temp_key = request.args.get('tempKey')

    if not engine:
        return jsonify({"error": "missing_engine"}), 400

    config = load_config()
    engine_config = config["engines"].get(engine)
    if not engine_config:
        return jsonify({"error": "invalid_engine"}), 400

    api_key = temp_key or engine_config.get("api_key")

    if not api_key and engine not in ["ollama", "lmstudio"]:
        return jsonify({"error": "missing_api_key", "message": f"API key not set for {engine}"}), 400

    headers, params, url = {}, {}, ""

    if engine == "openai":
        url = "https://api.openai.com/v1/models"
        headers["Authorization"] = f"Bearer {api_key}"
    elif engine == "gemini":
        url = engine_config.get("endpoint")
        params = {"key": api_key, "pageSize": 1000}
    elif engine == "openrouter":
        url = "https://openrouter.ai/api/v1/models"
        headers["Authorization"] = f"Bearer {api_key}"
    elif engine == "ollama":
        url = engine_config.get("endpoint").replace("/api/chat", "/api/tags")
    elif engine == "lmstudio":
        url = engine_config.get("endpoint").replace("/chat/completions", "/models")
    else:
        return jsonify({"error": "unsupported_engine"}), 400

    try:
        res = requests.get(url, headers=headers, params=params, timeout=15)
        res.raise_for_status()
        data = res.json()
        if engine == "ollama":
            return jsonify({"data": [{"id": m.get("name"), "object": "model"} for m in data.get("models", [])]})
        return jsonify(data)
    except requests.exceptions.RequestException as e:
        error_text = f"An unknown error occurred while contacting {engine}."
        if isinstance(e, requests.exceptions.ConnectionError):
            error_text = f"Could not connect to {engine}. Please ensure the local server is running."
        elif e.response is not None:
            error_text = f"Error from {engine} (Status {e.response.status_code}): {e.response.text}"
        
        logging.error(f"Failed to get models from {engine}: {error_text}")
        return jsonify({"error": "provider_error", "text": error_text}), 500

@app.route('/translation-modes', methods=['POST'])
def update_translation_modes():
    try:
        data = request.json
        config = load_config()
        modes = config.setdefault("translation_modes", {})
        if "default_mode" in data: modes["default_mode"] = data["default_mode"]
        if "thinking_enabled" in data: modes["thinking_enabled"] = data["thinking_enabled"]
        if "prompt_override" in data:
            override = data["prompt_override"]
            mode, prompt = override.get("mode"), override.get("prompt")
            if mode:
                overrides = modes.setdefault("custom_overrides", {})
                if prompt: overrides[mode] = prompt
                elif mode in overrides: del overrides[mode]
        save_config(config)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/saved-models', methods=['GET'])
def get_saved_models():
    return jsonify(load_config().get("saved_models", []))

def upsert_saved_model(config, engine, model_id, display_name, api_key_hash):
    saved_models = config.setdefault("saved_models", [])
    for model in saved_models:
        if model.get("engine") == engine and model.get("model_id") == model_id:
            model.update({"display_name": display_name, "api_key_hash": api_key_hash})
            return
    saved_models.append({
        "engine": engine, "model_id": model_id, "display_name": display_name,
        "added_at": datetime.now().isoformat(), "api_key_hash": api_key_hash
    })

@app.route('/save-model', methods=['POST'])
def save_model():
    data = request.json
    engine, model_id, temp_api_key = data.get("engine"), data.get("model_id"), data.get("api_key")

    if not all([engine, model_id]):
        return jsonify({"success": False, "message": "Engine and model_id are required."}), 400

    config = load_config()
    if engine not in config["engines"]:
        return jsonify({"success": False, "message": f"Engine '{engine}' not configured."}), 400
        
    effective_api_key = temp_api_key or config["engines"].get(engine, {}).get("api_key", "")

    if temp_api_key and engine not in ["ollama", "lmstudio"]:
        config["engines"][engine]["api_key"] = temp_api_key

    if not effective_api_key and engine not in ["ollama", "lmstudio"]:
        return jsonify({"success": False, "message": f"API key is required for {engine}."}), 400

    api_key_hash = hashlib.sha256(effective_api_key.encode()).hexdigest() if effective_api_key else ""
    provider_map = {"openai": "OpenAI", "gemini": "Gemini", "openrouter": "OpenRouter", "ollama": "Ollama", "lmstudio": "LM Studio"}
    display_name = f"{provider_map.get(engine, engine.capitalize())} · {model_id}"

    upsert_saved_model(config, engine, model_id, display_name, api_key_hash)
    config.update({"default_engine": engine, "default_model": model_id})
    save_config(config)
    return jsonify({"success": True})

@app.route('/set-default-model', methods=['POST'])
def set_default_model():
    data = request.json
    engine, model_id = data.get("engine"), data.get("model_id")
    if not all([engine, model_id]):
        return jsonify({"success": False, "message": "Engine and model_id are required."}), 400
    config = load_config()
    config.update({"default_engine": engine, "default_model": model_id})
    save_config(config)
    return jsonify({"success": True})

def wrap_think_content(text: str) -> str:
    return re.sub(r'(<think>)(.*?)(</think>)', r'\1<div class="think-content">\2</div>\3', text.strip(), flags=re.DOTALL)

def provider_defaults(engine: str) -> str:
    return {"openai": "gpt-3.5-turbo", "gemini": "gemini-1.5-pro", "openrouter": "openrouter/auto", "ollama": "llama3", "lmstudio": "local-model"}.get(engine, "")

@app.route('/translate', methods=['POST'])
def translate():
    engine = "Unknown"
    try:
        data = request.json
        text = data['text']
        target_lang = data['target_lang']
        config = load_config()

        engine = data.get('engine') or config.get("default_engine")
        model = data.get('model') or config.get("default_model") or provider_defaults(engine)

        try:
            source_lang = detect(text)
        except Exception:
            source_lang = "unknown"

        modes = config.get("translation_modes", {})
        mode = modes.get("default_mode", "only_translate")
        prompt_template = modes.get("custom_overrides", {}).get(mode) or modes.get("presets", {}).get(mode) or ""
        prompt = prompt_template.replace("{{TARGET_LANG}}", target_lang).replace(
            "{{SOURCE_LANG}}", source_lang if source_lang != "unknown" else "the source language"
        )

        api_key = config.get("engines", {}).get(engine, {}).get("api_key")
        if not api_key and engine not in ["ollama", "lmstudio"]:
            return jsonify({"output": f"Error: API key not set for {engine}"}), 200

        thinking_enabled = bool(modes.get("thinking_enabled", False))
        output = translate_via_provider(engine, model, text, api_key, prompt, thinking_enabled)

        return Response(json.dumps({"output": wrap_think_content(output)}), mimetype='application/json')
    
    except tenacity.RetryError as e:
        last_exception = e.last_attempt.exception()
        engine_name = engine.capitalize()
        error_message = f"Error connecting to {engine_name}. The provider might be offline or busy."

        if isinstance(last_exception, requests.exceptions.ConnectionError):
            error_message = (
                f"Connection to {engine_name} failed. "
                f"Please ensure the local server is running. For Ollama, try quitting the app "
                f"from the system tray and restarting it."
            )
        elif isinstance(last_exception, requests.exceptions.ReadTimeout):
            error_message = (
                f"Connection to {engine_name} timed out. The model might be loading, which can be "
                f"slow on the first request. Please wait a moment and try again."
            )
        
        logging.error(f"Could not connect to {engine} after retries: {last_exception}")
        return Response(json.dumps({"output": error_message}), mimetype='application/json', status=200)
        
    except Exception as e:
        logging.exception("An unhandled error occurred during translation")
        return Response(json.dumps({"output": f"A critical server error occurred: {e}"}), mimetype='application/json'), 500

@tenacity.retry(
    wait=tenacity.wait_exponential(multiplier=1, min=2, max=10),
    stop=tenacity.stop_after_attempt(3),
    retry=tenacity.retry_if_exception_type(requests.exceptions.RequestException)
)
def translate_via_provider(engine: str, model: str, text: str, api_key: str, system_prompt: str, thinking_enabled: bool) -> str:
    config = load_config()
    engine_config = config['engines'][engine]
    base_url = engine_config.get("endpoint", "")
    headers = {"Content-Type": "application/json"}
    params, json_body, url = {}, {}, base_url

    if engine == "gemini":
        url = f"{base_url.rstrip('/')}/{model}:generateContent"
        params["key"] = api_key
        json_body = {
            "contents": [
                {"role": "user", "parts": [{"text": system_prompt}, {"text": text}]}
            ],
            "generationConfig": {"temperature": 0.2}
        }
    else:
        if engine in ["openai", "openrouter", "lmstudio"] and api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        json_body = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            "temperature": 0.2
        }

        if engine == "openrouter":
            if thinking_enabled:
                json_body["reasoning"] = {"enabled": True}
            else:
                json_body["reasoning"] = {"exclude": True}
                json_body["include_reasoning"] = False
        
        if engine == "ollama":
            json_body["stream"] = False
            json_body["think"] = bool(thinking_enabled)

    try:
        res = requests.post(url, headers=headers, params=params, json=json_body, timeout=60)
        res.raise_for_status()
        result = res.json()

        if engine in ["openai", "openrouter", "lmstudio"]:
            return result["choices"][0]["message"]["content"]
        elif engine == "gemini":
            return result['candidates'][0]['content']['parts'][0]['text']
        elif engine == "ollama":
            return result["message"]["content"]

        raise ValueError(f"Unsupported engine for parsing response: {engine}")
    except requests.exceptions.RequestException as e:
        logging.error(f"API call to {engine} failed with status {e.response.status_code if e.response else 'N/A'}: {e}")
        raise
    except (KeyError, IndexError):
        logging.error(f"Malformed response from {engine}: {result}")
        return "Error: Malformed provider response."

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
    app.run(debug=True, port=3000)