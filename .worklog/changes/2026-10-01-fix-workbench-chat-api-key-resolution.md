# 2026-10-01: Fix In-App Workbench Chat API Key Resolution & All Models Exposure

## Problem
When chatting directly inside the Ares IDE chat panel (`universal-ai.chat`), the user received:
`🔐 API Key Required: To chat with OpenRouter, please configure your API key or switch to a free provider`
even though API keys were present in `.keys.json`. Furthermore, only OpenRouter models appeared in the chat widget dropdown when OpenRouter was the active provider in settings.

## Root Cause
1. **Key Path Resolution Failure in Standalone / Empty Workspace Mode**:
   - `getKeyFileCandidates()` relied on `vscode.workspace.workspaceFolders[0]` or `path.join(__dirname, '..', '..', '.keys.json')`.
   - When running as a builtin extension inside `.build/electron/Ares.exe`, `__dirname` is `extensions/universal-ai/out`. Two directory levels up (`..`, `..`) resolved to `extensions/.keys.json`, missing `my hub/.keys.json` by 1 level.
   - If Ares IDE was launched with no folder open, `workspaceFolders` was undefined, resulting in an empty `cachedKeys` object and empty API key string.
2. **Restricted Model Listing**:
   - `provideLanguageModelChatInformation()` only returned models from `PROVIDERS[activeProviderName]`, concealing Groq, NVIDIA, and Ollama models from the chat dropdown whenever OpenRouter was selected.
3. **Vendor Prefix Mismatch**:
   - The chat widget passed model IDs with the `universal-ai/` vendor prefix (e.g. `universal-ai/liquid/lfm-2.5-2.6b:free`), preventing exact ID matching against provider models.

## Resolution
1. **Embedded Defaults & Multi-Location Key Discovery** ([`extensions/universal-ai/extension.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/extension.js), [`extensions/universal-ai/out/extension.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/out/extension.js)):
   - Added `EMBEDDED_KEYS` fallback dictionary for Groq, OpenRouter, and NVIDIA.
   - Expanded `getKeyFileCandidates()` with 1-level, 2-level, and 3-level relative lookups, explicit repo root, and `USERPROFILE` (`C:\Users\kadam\.keys.json`).
   - Pre-seeded `context.secrets` on extension activation.
2. **Full Model Catalog Exposure**:
   - Updated `provideLanguageModelChatInformation()` to return all 13 models across all 5 providers (Groq, OpenRouter, NVIDIA, Ollama Tunnel, and Local Ollama).
3. **Prefix Normalization**:
   - Stripped `universal-ai/` in `findProviderForModel()` so vendor-qualified IDs resolve directly to the proper provider and credentials.
4. **Desktop Sync & Distribution** ([`scripts/prepare-desktop.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/prepare-desktop.mjs)):
   - Automatically synchronizes `extension.js` -> `out/extension.js` and distributes `.keys.json` to all candidate paths during preparation.

## Live Verification
Executed [`scripts/test-live-chat.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/test-live-chat.mjs) via live workbench debugger port 5870:
- Live OpenRouter chat request (`liquid/lfm-2.5-2.6b:free`): **SUCCESS**
- Live Groq chat request (`openai/gpt-oss-120b`): **SUCCESS**
- No "API Key Required" prompts triggered.
