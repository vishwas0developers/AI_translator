let currentTargetLang = localStorage.getItem("targetLang") || "en";
let currentApiEngine = "openai";
let currentApiModel = "";
let currentApiKey = "";

const apiModelSelect = document.getElementById("apiModelSelect");
const settingsErrorDiv = document.getElementById("settingsError");
const savedModelsDropdown = document.getElementById("savedModelsDropdown");

const providerNameMap = {
  "openai": "OpenAI",
  "gemini": "Gemini",
  "openrouter": "OpenRouter",
  "ollama": "Ollama",
  "lmstudio": "LM Studio"
};

async function onSavedModelChange(value) {
  if (!value) return;
  const [engine, model_id] = value.split("::");
  try {
    const response = await fetch("/set-default-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engine, model_id })
    });
    const data = await response.json();
    if (data.success) {
      currentApiEngine = engine;
      currentApiModel = model_id;
      console.log(`Default model set to ${providerNameMap[engine]} · ${model_id}`);
    } else {
      console.error("Failed to set default model:", data.message);
    }
  } catch (error) {
    console.error("Error setting default model:", error);
  }
}

window.onload = function () {
  const inputTextarea = document.getElementById("inputText");
  const settingsModal = document.getElementById("settingsModal");
  const defaultEngineSelect = document.getElementById("defaultEngineSelect");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const fetchModelsBtn = document.getElementById("fetchModelsBtn");
  const translateButton = document.querySelector(".translate-btn");

  settingsModal.style.display = "none";

  fetch('/get-config').then(response => response.json()).then(data => {
    currentApiEngine = data.default_engine || "openai";
    currentApiModel = data.default_model || "";
    defaultEngineSelect.value = currentApiEngine;
    populateSavedModelsDropdown();
    if (data.engines && data.engines[currentApiEngine]) {
      apiKeyInput.value = data.engines[currentApiEngine].api_key || "";
    } else {
      apiKeyInput.value = "";
    }
  }).catch(error => console.error('Error fetching config:', error));

  if (inputTextarea) {
    inputTextarea.addEventListener("input", () => {
      updateCharCount();
      autoGrowTextarea(inputTextarea);
    });
  }

  if (translateButton) {
    translateButton.addEventListener("click", window.translate);
  }

  updateCharCount();
  const targetLangSpan = document.querySelector(`.target-languages-desktop span[onclick="window.setTargetLang('${currentTargetLang}')"]`);
  if (targetLangSpan) {
    targetLangSpan.classList.add('active-lang');
  }

  fetchModelsBtn.addEventListener("click", async () => {
    settingsErrorDiv.textContent = "";
    const selectedEngine = defaultEngineSelect.value;
    const enteredApiKey = apiKeyInput.value;
    await populateModelDropdown(selectedEngine, enteredApiKey);
    if (currentApiModel && Array.from(apiModelSelect.options).some(option => option.value === currentApiModel)) {
      apiModelSelect.value = currentApiModel;
    } else if (apiModelSelect.options.length > 0) {
      apiModelSelect.value = apiModelSelect.options[0].value;
      currentApiModel = apiModelSelect.options[0].value;
    } else {
      currentApiModel = "";
    }
  });

  saveSettingsBtn.addEventListener("click", async () => {
    settingsErrorDiv.textContent = "";
    const selectedEngine = defaultEngineSelect.value;
    const selectedModelId = apiModelSelect.value;
    const enteredApiKey = apiKeyInput.value;

    if (!selectedModelId) {
        settingsErrorDiv.textContent = "Please fetch and select a model before saving.";
        return;
    }
    
    try {
      const response = await fetch('/save-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: selectedEngine,
          model_id: selectedModelId,
          api_key: enteredApiKey
        }),
      });
      const data = await response.json();
      if (data.success) {
        currentApiEngine = selectedEngine;
        currentApiModel = selectedModelId;
        currentApiKey = enteredApiKey;
        alert("Settings saved successfully!");
        closeModal();
        await populateSavedModelsDropdown();
      } else {
        settingsErrorDiv.textContent = data.message || "Failed to save settings.";
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      settingsErrorDiv.textContent = "Error saving settings.";
    }
  });

  document.getElementById('saveTranslationModeBtn').addEventListener('click', async () => {
    const payload = {
      default_mode: document.getElementById('modeSelect').value,
      thinking_enabled: document.getElementById('thinkingToggle').checked,
      prompt_override: {
        mode: document.getElementById('modeSelect').value,
        prompt: document.getElementById('modePrompt').value
      }
    };
    try {
      const response = await fetch('/translation-modes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        alert("Translation mode settings saved successfully!");
        await populateTranslationModeUI();
      } else {
        alert("Failed to save settings: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error('Error saving translation mode settings:', error);
      alert("Error saving translation mode settings.");
    }
  });

  document.getElementById('resetPromptBtn').addEventListener('click', async () => {
    const selectedMode = document.getElementById('modeSelect').value;
    const payload = { prompt_override: { mode: selectedMode, prompt: "" } };
    try {
      const response = await fetch('/translation-modes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        alert(`Prompt for "${selectedMode.replace(/_/g, ' ')}" reset to default.`);
        await populateTranslationModeUI();
      } else {
        alert("Failed to reset prompt: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error('Error resetting prompt:', error);
      alert("Error resetting prompt.");
    }
  });

  defaultEngineSelect.addEventListener("change", async () => {
    const selectedEngine = defaultEngineSelect.value;
    const apiKeyInput = document.getElementById("apiKeyInput");

    if (selectedEngine === 'ollama' || selectedEngine === 'lmstudio') {
        apiKeyInput.disabled = true;
        apiKeyInput.placeholder = "Not required for local models";
        apiKeyInput.value = "";
    } else {
        apiKeyInput.disabled = false;
        apiKeyInput.placeholder = "Enter your API key";
    }

    try {
      const response = await fetch('/get-config');
      const data = await response.json();
      if (data.engines && data.engines[selectedEngine]) {
        apiKeyInput.value = data.engines[selectedEngine].api_key || "";
      } else {
        apiKeyInput.value = "";
      }
      apiModelSelect.innerHTML = '';
      apiModelSelect.disabled = true;
      settingsErrorDiv.textContent = "";
    } catch (error) {
      console.error('Error fetching config for selected engine:', error);
      apiKeyInput.value = "";
    }
  });
};

async function populateSavedModelsDropdown() {
  try {
    const [configResponse, savedModelsResponse] = await Promise.all([
      fetch('/get-config'),
      fetch('/saved-models')
    ]);
    const configData = await configResponse.json();
    let savedModelsData = await savedModelsResponse.json();

    savedModelsDropdown.innerHTML = '';
    if (savedModelsData.length === 0) {
      savedModelsDropdown.innerHTML = '<option value="">No saved models</option>';
      savedModelsDropdown.disabled = true;
    } else {
      // समाधान: सहेजे गए मॉडलों को प्रदर्शन नाम के अनुसार वर्णानुक्रम में छाँटें
      savedModelsData.sort((a, b) => a.display_name.localeCompare(b.display_name));

      savedModelsData.forEach(model => {
        const option = document.createElement("option");
        option.value = `${model.engine}::${model.model_id}`;
        option.textContent = model.display_name;
        savedModelsDropdown.appendChild(option);
      });
      savedModelsDropdown.disabled = false;
      const defaultModelValue = `${configData.default_engine}::${configData.default_model}`;
      if (Array.from(savedModelsDropdown.options).some(o => o.value === defaultModelValue)) {
        savedModelsDropdown.value = defaultModelValue;
      } else if (savedModelsDropdown.options.length > 0) {
        savedModelsDropdown.value = savedModelsDropdown.options[0].value;
        onSavedModelChange(savedModelsDropdown.value);
      }
    }
  } catch (error) {
    console.error('Error populating saved models dropdown:', error);
    savedModelsDropdown.innerHTML = '<option value="">Error loading</option>';
    savedModelsDropdown.disabled = true;
  }
}

async function populateModelDropdown(engine, tempKey = '') {
  apiModelSelect.innerHTML = '<option>Fetching models...</option>';
  apiModelSelect.disabled = true;
  settingsErrorDiv.textContent = "";

  let url = `/get-models?engine=${engine}`;
  if (tempKey) url += `&tempKey=${encodeURIComponent(tempKey)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    apiModelSelect.innerHTML = '';

    if (data.error) {
      settingsErrorDiv.textContent = data.text || "An unknown error occurred.";
      return;
    }

    let models = [];
    if (engine === "openai" || engine === "openrouter" || engine === "ollama" || engine === "lmstudio") {
        models = data.data.map(model => ({ value: model.id, text: model.id }));
    } else if (engine === "gemini") {
        models = data.models.map(model => ({ value: model.name.replace('models/', ''), text: model.name.replace('models/', '') }));
    }

    if(models.length === 0){
        settingsErrorDiv.textContent = "No models found. For local models, ensure the server is running.";
    } else {
        // समाधान: मॉडलों को उनके टेक्स्ट नाम के अनुसार वर्णानुक्रम में छाँटें
        models.sort((a, b) => a.text.localeCompare(b.text));

        models.forEach(model => {
            const option = document.createElement("option");
            option.value = model.value;
            option.textContent = model.text;
            apiModelSelect.appendChild(option);
        });
        apiModelSelect.disabled = false;
    }
  } catch (error) {
    console.error('Error fetching models:', error);
    settingsErrorDiv.textContent = "Error fetching models. Check your API key or local server connection.";
    apiModelSelect.innerHTML = '';
  }
}

window.openModal = async function() {
  const settingsModal = document.getElementById("settingsModal");
  settingsModal.style.display = "flex";
  setTimeout(() => settingsModal.classList.add('show'), 10);

  try {
    const configResponse = await fetch('/get-config');
    const data = await configResponse.json();
    currentApiEngine = data.default_engine || "openai";
    currentApiModel = data.default_model || "";
    const engineSelect = document.getElementById("defaultEngineSelect");
    engineSelect.value = currentApiEngine;
    
    const apiKeyInput = document.getElementById("apiKeyInput");
    if (currentApiEngine === 'ollama' || currentApiEngine === 'lmstudio') {
        apiKeyInput.disabled = true;
        apiKeyInput.placeholder = "Not required for local models";
    } else {
        apiKeyInput.disabled = false;
        apiKeyInput.placeholder = "Enter your API key";
    }

    if (data.engines && data.engines[currentApiEngine]) {
      apiKeyInput.value = data.engines[currentApiEngine].api_key || "";
    } else {
      apiKeyInput.value = "";
    }
    
    apiModelSelect.innerHTML = '';
    apiModelSelect.disabled = true;
    settingsErrorDiv.textContent = "";
  } catch (error) {
    console.error('Error fetching API config on modal open:', error);
  }

  await populateTranslationModeUI();
  window.showSettingsPanel('apiConfigPanel');
}

window.showSettingsPanel = function(panelId) {
  document.querySelectorAll('.modal-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
  document.getElementById(panelId).style.display = 'block';
  document.querySelector(`.tab-button[onclick="window.showSettingsPanel('${panelId}')"]`).classList.add('active');
}

async function populateTranslationModeUI() {
  try {
    const response = await fetch('/translation-modes');
    const data = await response.json();
    const modeSelect = document.getElementById('modeSelect');
    const modePrompt = document.getElementById('modePrompt');
    const thinkingToggle = document.getElementById('thinkingToggle');

    modeSelect.innerHTML = '';
    for (const modeKey in data.presets) {
      const option = document.createElement('option');
      option.value = modeKey;
      option.textContent = modeKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      modeSelect.appendChild(option);
    }

    modeSelect.value = data.default_mode;
    const currentMode = modeSelect.value;
    modePrompt.value = data.custom_overrides[currentMode] || data.presets[currentMode];
    thinkingToggle.checked = data.thinking_enabled;

    modeSelect.onchange = () => {
      const selectedMode = modeSelect.value;
      modePrompt.value = data.custom_overrides[selectedMode] || data.presets[selectedMode];
    };
  } catch (error) {
    console.error('Error fetching translation modes:', error);
  }
}

window.closeModal = function() {
  const settingsModal = document.getElementById("settingsModal");
  settingsModal.classList.remove('show');
  setTimeout(() => settingsModal.style.display = "none", 300);
}

window.translate = async function() {
  const inputText = document.getElementById("inputText").value;
  const outputDiv = document.getElementById("outputText");
  if (!inputText.trim()) {
    outputDiv.innerHTML = "Please enter text to translate.";
    return;
  }
  outputDiv.innerHTML = "Translating...";

  try {
    const response = await fetch('/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: inputText,
        target_lang: currentTargetLang,
        engine: currentApiEngine,
        model: currentApiModel
      }),
    });
    const data = await response.json();
    if (data.output) {
      outputDiv.innerHTML = data.output;
      addThinkTagToggleListeners();
    } else {
      outputDiv.innerHTML = data.message || "An unknown error occurred.";
    }
  } catch (error) {
    console.error('Translation error:', error);
    outputDiv.innerHTML = "Network error or server unreachable.";
  }
}

function addThinkTagToggleListeners() {
  document.querySelectorAll('think').forEach(tag => {
    tag.removeEventListener('click', toggleThinkTag);
    tag.addEventListener('click', toggleThinkTag);
  });
}

function toggleThinkTag(event) {
  event.currentTarget.classList.toggle('expanded');
}

function autoGrowTextarea(element) {
  element.style.height = "auto";
  element.style.height = (element.scrollHeight) + "px";
}

function updateCharCount() {
  const inputTextarea = document.getElementById("inputText");
  const charCount = document.getElementById("charCount");
  const maxLength = 5000;
  const currentLength = inputTextarea.value.length;
  charCount.textContent = `${currentLength} / ${maxLength}`;
  charCount.style.color = currentLength > maxLength ? 'red' : '#70757a';
}

window.setTargetLang = function(lang) {
  currentTargetLang = lang;
  localStorage.setItem("targetLang", lang);
  document.querySelectorAll('.target-languages-desktop span, .target-languages-mobile span').forEach(s => s.classList.remove('active-lang'));
  document.querySelectorAll(`.target-languages-desktop span[onclick="window.setTargetLang('${lang}')"], .target-languages-mobile span[onclick="window.setTargetLang('${lang}')"]`).forEach(s => s.classList.add('active-lang'));
}

function copyText(elementId, buttonElement) {
    const element = document.getElementById(elementId);
    const textToCopy = element.innerText || element.value;

    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
        if (buttonElement) {
            const originalContent = buttonElement.innerHTML;
            buttonElement.innerHTML = '✅';
            buttonElement.disabled = true;
            setTimeout(() => {
                buttonElement.innerHTML = originalContent;
                buttonElement.disabled = false;
            }, 1500);
        }
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        if (buttonElement) {
            const originalContent = buttonElement.innerHTML;
            buttonElement.innerHTML = '❌';
            setTimeout(() => {
                buttonElement.innerHTML = originalContent;
            }, 2000);
        }
    });
}

window.switchLanguages = function() {
  const inputTextarea = document.getElementById("inputText");
  const outputDiv = document.getElementById("outputText");
  
  const inputVal = inputTextarea.value;
  const outputVal = outputDiv.innerText;

  inputTextarea.value = outputVal;
  outputDiv.innerHTML = inputVal;

  document.getElementById("detectedLangLabel").innerHTML = `<strong>Detected</strong>`;
  document.getElementById("detectedLangLabelMobile").innerHTML = `<strong>Detected</strong>`;

  autoGrowTextarea(inputTextarea);
  updateCharCount();
}