# Plan: Remove Copilot-Related Elements & Add Our Models Workflow

**Date**: 2026-09-30  
**Status**: Confirmed by User - Executing  
**Goal**: Completely remove GitHub Copilot sign-in/upsells from the **Language Models** page, replace them with **Universal AI**'s clean model & API key adding workflow, and provide an instant **Test API Key** feature for every provider.

---

## 1. What Copilot Elements Will Be Removed
Currently, the **Language Models** screen ([`chatModelsWidget.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/chatManagement/chatModelsWidget.ts)) contains the following Copilot-tied behaviors:
1. **Copilot Sign-In Action**:
   - `buildAddModelsDropdownActions()` automatically injects `signIn-github-copilot` ("GitHub Copilot") as the first action when `[ Add Models ]` is clicked.
   - Runs `CHAT_SETUP_ACTION_ID`, prompting for GitHub Copilot login.
   - **Removal**: Strip out `signIn-github-copilot` entirely.
2. **Copilot Entitlement Lockout**:
   - `supportsAddingModels` checks `chatEntitlementService` and `clientByokEnabled`. If no Copilot subscription is found, adding models is blocked or restricted.
   - **Removal**: Set adding capability to `true` permanently so our self-hosted models can always be added and configured without any Microsoft subscription.
3. **Copilot Upsell / Managed Tooltips**:
   - Removes tooltips stating "Adding models is managed by your organization" tied to Microsoft entitlements.

---

## 2. What Will Be Added for Our Models
We will replace the Copilot action with our **Universal AI** model & API workflow:

### A. Direct `[ Add Models ]` Action Menu
When the user clicks the blue **`[ Add Models ]`** button, it will show our clean list of providers:
* **Add Groq Model** (Ultra-fast cloud inference)
* **Add OpenRouter Model** (100+ open-source models)
* **Add NVIDIA Model** (NVIDIA NIM endpoints)
* **Add OmniRoute Model** (Unified gateway)
* **Add Local Ollama Model** (Local offline models)
* **Add Custom OpenAI Model** (Any custom URL & key)
* **Configure API Keys** (Update keys for existing providers)
* **Test API Key Connection** (Test whether each configured provider's API key is working)

### B. Test API Key Verification (`universal-ai.testApiKey`)
For every provider (Groq, OpenRouter, NVIDIA, OmniRoute, Ollama, Custom):
- User can select "Test API Key" or click "Test" when entering/viewing an API key.
- A quick ping is dispatched to verify connectivity and authentication:
  - If valid: Shows a success notification: `Groq API Key is valid and active (HTTP 200)`.
  - If invalid: Shows an error notification: `Groq API Key failed: 401 Unauthorized - Please check your key`.

### C. Interactive Model Creation Wizard (`universal-ai.addModel`)
Selecting any provider (or clicking the button) triggers a quick input flow:
1. **Model ID / Name**: e.g., `llama-3.3-70b-versatile`, `deepseek-chat`, `qwen-2.5-coder`.
2. **API Key**: Input box (masked) to store/update the key.
3. **Context Window**: Default to `128k` (or user customizable).
4. **Instant Update**:
   - Saves to configuration and memory.
   - Fires `onDidChangeLanguageModels`, so the new model **instantly appears as a row in the Language Models table** and in the Chat dropdown without restarting the server.

### C. Clean Aesthetics (Zero Icons)
* Strict adherence to user rule: **no icons, no emojis**.
* Clean, professional text in all menus and prompts.

---

## 3. Files to Modify

| File | Proposed Changes |
| :--- | :--- |
| [`src/vs/workbench/contrib/chat/browser/chatManagement/chatModelsWidget.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/chatManagement/chatModelsWidget.ts) | Remove `signIn-github-copilot`, remove Copilot entitlement gates, wire `[ Add Models ]` directly to Universal AI actions. |
| `.vscode-test-web/.../workbench.web.main.internal.js` | Patch runtime bundle to reflect the clean dropdown actions and link to `universal-ai.addModel`. |
| [`extensions/universal-ai/package.json`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/package.json) | Register `universal-ai.addModel` command and `managementCommand`. |
| [`extensions/universal-ai/extension.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/extension.js) | Implement `addModel` wizard, dynamic model registration, and instant table sync. |
| [`scripts/serve-web.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/serve-web.mjs) | Ensure `/api/chat` proxy dynamically routes requests for any newly added custom model. |

---

## 4. Verification Steps
1. Open `http://localhost:8080/?ew=true`.
2. Navigate to **Language Models** page (`View: Manage Language Models`).
3. Verify **GitHub Copilot** sign-in is gone from `[ Add Models ]`.
4. Click **`[ Add Models ]`**: verify our clean list of providers appears.
5. Click **Add Groq Model** (or any provider), type a model name and submit.
6. Verify the model appears immediately in the table and in the Chat picker.
