# AI-Powered General Text Translator

The AI-Powered General Text Translator is a versatile web application designed for seamless text translation across multiple languages using various cutting-edge AI models. It features a unique "System Promoter" that refines input text into optimized prompts, ensuring higher quality and more accurate translations while preserving the original meaning.

## Key Features:

*   **Multi-Engine Support:** Translate text using popular AI translation engines including OpenAI, Gemini, OpenRouter, Ollama, and LM Studio.
*   **Configurable API Settings:** Easily manage and persist API keys and default translation engine settings directly within the application.
*   **Automatic Language Detection:** Real-time detection of the source language for efficient input processing.
*   **Intelligent System Promoter:** Automatically corrects grammatical errors and rephrases input text into optimized prompts for AI models, enhancing translation quality.
*   **User-Friendly Interface:** An intuitive and clean web interface for effortless text input, language selection, and display of translated output.
*   **Convenient Functionality:** Includes copy-to-clipboard and language swap buttons for enhanced usability, along with a real-time character counter.

## Setup Instructions:

To set up and run the AI-Powered General Text Translator locally, follow these steps:

### Prerequisites:

*   Python 3.x
*   `pip` (Python package installer)

### Installation:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/AI_translator.git
    cd AI_translator
    ```
    *(Note: Replace `your-username` with your actual GitHub username after publishing.)*

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    ```

3.  **Activate the virtual environment:**
    *   **Windows:**
        ```bash
        .\venv\Scripts\activate
        ```
    *   **macOS/Linux:**
        ```bash
        source venv/bin/activate
        ```

4.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

### Configuration:

1.  **API Keys:** The application uses `config/api_config.json` to store API configurations. You will need to obtain API keys for your desired translation engines (OpenAI, Gemini, OpenRouter).
    *   An example `api_config.json` might look like this:
        ```json
        {
          "default_engine": "openai",
          "default_model": "gpt-3.5-turbo",
          "engines": {
            "openai": {
              "api_key": "YOUR_OPENAI_API_KEY",
              "endpoint": "https://api.openai.com/v1/chat/completions"
            },
            "gemini": {
              "api_key": "YOUR_GEMINI_API_KEY",
              "endpoint": "https://generativelanguage.googleapis.com/v1beta/models"
            },
            "openrouter": {
              "api_key": "YOUR_OPENROUTER_API_KEY",
              "endpoint": "https://openrouter.ai/api/v1/chat/completions"
            },
            "ollama": {
              "api_key": "",
              "endpoint": "http://localhost:11434/api/chat"
            },
            "lmstudio": {
              "api_key": "",
              "endpoint": "http://localhost:1234/v1/chat/completions"
            }
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
            "thinking_enabled": false
          }
        }
        ```
    *   Update the `api_key` values in `config/api_config.json` with your actual keys. For Ollama and LM Studio, API keys are typically not required if running locally. You can also manage these settings via the application's UI.

### Running the Application:

1.  **Start the Flask server:**
    ```bash
    python main.py
    ```

2.  **Access the application:**
    Open your web browser and navigate to `http://127.0.0.1:5000/`.

## Usage:

1.  **Input Text:** Type or paste the text you want to translate into the input area.
2.  **Language Detection:** The application will automatically detect the source language.
3.  **Select Target Language:** Choose your desired target language from the dropdown menu.
4.  **Select Translation Engine:** Select your preferred AI translation engine (OpenAI, Gemini, OpenRouter) from the settings.
5.  **Translate:** Click the "Translate" button to get the translated text.
6.  **System Promoter:** Your input text will be automatically corrected and rephrased into an optimized prompt before translation.
7.  **Copy/Swap:** Use the provided buttons to copy the translated text or swap the input and output languages.

## Project Structure:

```
.
├── AI_translator.rar
├── AI_translator.zip
├── main.py                 # Flask backend application
├── prd.md                  # Product Requirements Document
├── requirements.txt        # Python dependencies
├── run.bat                 # Windows batch script to run the app
├── setup.bat               # Windows batch script for setup
├── run.sh                  # Linux shell script to run the app
├── setup.sh                # Linux shell script for setup
├── Translate.png           # Screenshot/Image
├── Workflow_Diagram.png    # Workflow diagram image
├── config/
│   └── api_config.json     # API configuration settings
├── static/
│   ├── langdetect.min.js   # Language detection library (frontend)
│   ├── script.js           # Frontend JavaScript logic
│   └── style.css           # Frontend CSS styling
└── templates/
    └── index.html          # Frontend HTML template
```

## Contributing:

Contributions are welcome! Please feel free to fork the repository, create a new branch, and submit a pull request.

## License:

This project is open-source and available under the [MIT License](LICENSE).
*(Note: You may need to create a `LICENSE` file if you don't have one.)*
