# Product Requirements Document: General Text Translator

## 1. Introduction

This document outlines the requirements for the General Text Translator application. The application aims to provide users with a simple and efficient way to translate text between various languages using different AI-powered translation engines. **Additionally, the application will incorporate a "System Promoter" feature to refine input text into optimized prompts while preserving the original meaning.**

## 2. Goals

*   To provide a user-friendly interface for text translation.
*   To support multiple AI translation engines (OpenAI, Gemini, OpenRouter).
*   To allow users to configure their preferred default translation engine and API keys, ensuring persistence.
*   To provide real-time language detection for input text.
*   **To enhance input text by correcting sentences and rephrasing them as effective prompts for translation, without altering the core meaning.**

## 3. User Stories

*   As a user, I want to input text and get a translation in a selected target language.
*   As a user, I want to choose which translation engine to use for my translations.
*   As a user, I want to be able to set a default translation engine.
*   As a user, I want to be able to update the API keys for my translation engines, and have these keys persist for each engine.
*   As a user, I want to see the detected language of my input text.
*   As a user, I want to be able to copy the translated text.
*   As a user, I want to be able to switch the input and output languages.
*   **As a user, I want my input text to be automatically corrected and rephrased into an optimized prompt before translation, while maintaining its original intent.**

## 4. Functional Requirements

### 4.1. Translation Functionality

*   **FR1.1 - Text Input:** The system shall allow users to input text for translation.
*   **FR1.2 - Target Language Selection:** The system shall allow users to select a target language for translation from a predefined list.
*   **FR1.3 - Translation Engine Selection:** The system shall allow users to select a translation engine (OpenAI, Gemini, OpenRouter) for translation.
*   **FR1.4 - Automatic Source Language Detection:** The system shall automatically detect the source language of the input text.
*   **FR1.5 - Translation Request:** The system shall send a translation request to the selected (or default) translation engine API.
*   **FR1.6 - Display Translated Text:** The system shall display the translated text to the user.
*   **FR1.7 - Error Handling (Translation):** The system shall display appropriate error messages if translation fails (e.g., network issues, invalid API key, API-specific errors).

### 4.2. Configuration Management

*   **FR2.1 - API Configuration Storage:** The system shall store API configurations (default engine, API keys, endpoints) in `config/api_config.json`.
*   **FR2.2 - Load Configuration:** The system shall load API configurations on application startup.
*   **FR2.3 - Update Default Engine:** The system shall allow users to update the default translation engine.
*   **FR2.4 - Update API Key:** The system shall allow users to update the API key for a specific translation engine. **The API key for a provider shall persist even if a different provider is set as default.**
*   **FR2.5 - Save Configuration:** The system shall save updated configurations persistently. **Only the selected default engine and its corresponding API key (if provided) will be updated upon saving; other engine configurations will remain unchanged.**
*   **FR2.6 - Error Handling (Configuration):** The system shall provide feedback for failed configuration updates (e.g., missing data, invalid engine).

### 4.3. User Interface (Frontend)

*   **FR3.1 - Translation Interface:** The system shall provide a clear interface for text input, target language selection, and translated output display. **The existing UI design is largely complete and requires minimal changes.**
*   **FR3.2 - API Configuration Popup:** The system shall include a modal/popup for API configuration.
*   **FR3.3 - Display Default Engine in Popup:** The API configuration popup shall display the currently selected default API provider and its associated model.
*   **FR3.4 - Select Default Engine in Popup:** The API configuration popup shall allow users to change the default API provider and model.
*   **FR3.5 - Input API Key in Popup:** The API configuration popup shall include an input field for the API key of the selected default engine.
*   **FR3.6 - Save Configuration Button:** The API configuration popup shall have a "Save" button to apply changes.
*   **FR3.7 - Copy Text Functionality:** The system shall provide buttons to copy input and output text.
*   **FR3.8 - Language Swap Functionality:** The system shall provide a button to swap the content of the input and output text areas, and update the target language accordingly.
*   **FR3.9 - Character Count:** The system shall display the character count of the input text.

### 4.4. System Promoter Functionality

*   **FR4.1 - Sentence Correction:** The system shall correct grammatical errors and improve the sentence structure of the input text.
*   **FR4.2 - Prompt Rephrasing:** The corrected sentence shall be rephrased into an optimized prompt format suitable for AI translation engines.
*   **FR4.3 - Meaning Preservation:** The rephrased prompt must accurately reflect the original meaning and intent of the input text, with minimal semantic changes.
*   **FR4.4 - Integration with Translation:** The system promoter's output (the optimized prompt) shall be used as the input for the translation engine.

## 5. Non-Functional Requirements

*   **NFR1 - Performance:** Translations and prompt generation should be processed and displayed within a reasonable time frame (e.g., typically under 2-3 seconds for short texts).
*   **NFR2 - Security:** API keys should be handled securely and not exposed on the client-side.
*   **NFR3 - Usability:** The user interface should be intuitive and easy to navigate.
*   **NFR4 - Maintainability:** The codebase should be well-structured, modular, and easy to understand for future enhancements.
*   **NFR5 - Scalability:** The backend should be able to handle an increasing number of translation and prompt generation requests (dependent on API limits of external services).

## 6. Technical Design Considerations

### 6.1. Backend (Flask - `main.py`)

*   **API Endpoints:**
    *   `/`: Renders `index.html` and passes the `default_engine` from config.
    *   `/translate` (POST): Handles translation requests, detects source language, **applies system promoter logic**, calls external APIs, and returns translated text.
    *   `/update-config` (POST): Receives and saves `default_engine` and `api_key` updates to `api_config.json`.
*   **Configuration Handling:** `load_config()` and `save_config()` functions for JSON file management. **Note: Current persistence is via `api_config.json`. If SQLite is a future requirement, it will necessitate a separate task for database integration.**
*   **External API Integration:** Use `requests` library for HTTP calls to OpenAI, Gemini, and OpenRouter.
*   **Language Detection:** Utilize `langdetect` library.
*   **System Promoter Logic:** Implement a function or module to perform sentence correction and prompt rephrasing. This might involve additional API calls to a language model for prompt optimization.

### 6.2. Frontend (HTML, CSS, JavaScript - `templates/index.html`, `static/style.css`, `static/script.js`)

*   **HTML Structure:** `index.html` for the main layout, text areas, language selection, and the API configuration modal.
*   **CSS Styling:** `style.css` for visual presentation and responsiveness.
*   **JavaScript Logic (`script.js`):**
    *   Event listeners for user interactions (translate button, copy buttons, switch languages, settings modal).
    *   Functions for `updateCharCount`, `detectLangLive`, `autoGrowTextarea`, `setTargetLang`, `copyText`, `switchLanguages`.
    *   Asynchronous `fetch` requests to backend endpoints (`/translate`, `/update-config`, and a new `/get-config` if needed for initial frontend load of all API keys).
    *   Logic to manage the API configuration modal's visibility and data population/submission, ensuring API keys for non-default engines are retained in the backend.
    *   Client-side error handling and feedback.

## 7. Workflow Diagram

```mermaid
graph TD
    A[Start Application] --> B{Load API Configuration};
    B --> C[User Accesses Web Page];
    C --> D[User Enters Text, Selects Language & Engine];
    D --> E{Submit Translation Request};
    E --> F[Detect Source Language];
    F --> G[Apply System Promoter: Correct & Rephrase as Prompt];
    G --> H{Retrieve Engine API Key & Endpoint};
    H --> I{Select Translation Engine};
    I -- OpenAI --> J[Call OpenAI API];
    I -- Gemini --> K[Call Gemini API];
    I -- OpenRouter --> L[Call OpenRouter API];
    J --> M{Process API Response};
    K --> M;
    L --> M;
    M --> N[Return Translated Text to Frontend];
    N --> O[Display Translated Text];
    O --> P[End Translation Process];

    subgraph Configuration Update
        Q[User Opens API Config Popup] --> R{User Selects Default Engine/Model OR Enters New API Key};
        R --> S{Send Update Request to /update-config};
        S --> T[Receive New Configuration Data];
        T --> U[Update default_engine and/or api_key for selected engine in config];
        U --> V[Save Updated Config to api_config.json];
        V --> W[Confirm Update to Frontend];
    end