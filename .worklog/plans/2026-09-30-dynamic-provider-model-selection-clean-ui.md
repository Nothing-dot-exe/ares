# Implementation Plan: Dynamic Provider Model Selection & Clean UI (No Icons)

**Date**: 2026-09-30  
**User Request**: 
1. When user clicks Image 1 (`AI: Groq`), Image 2 appears (`Select your active AI provider`).
2. When user selects any provider in Image 2, all models of that selected provider must appear in Image 3 (Chat Model Picker).
3. Completely remove all icons/emojis from model names and remove icons from Image 1 status bar button (clean UI).

---

## 🔍 Architecture & Strategy

1. **Clean UI (Zero Icons/Emojis)**:
   - Strip all icon prefixes (`⚡`, `👁️`, `🌐`, `🔀`, `💻`) from model names across `PROVIDERS` in `extensions/universal-ai/extension.js`.
   - Strip `$(sparkle)` and `$(zap)` codicons from the status bar item text so it reads purely `AI: ${provider}`.

2. **Dynamic Model Provider Refresh**:
   - Add a `vscode.EventEmitter` for `onDidChangeLanguageModelChatInformation` in `extensions/universal-ai/extension.js`.
   - In `provideLanguageModelChatInformation()`, read the currently active provider from `universalAi.provider` (defaulting to `'Groq'`).
   - Return only the models of that active provider, or return the active provider's models so they populate Image 3 directly.
   - When the user selects a provider in Image 2:
     - Update `universalAi.provider` and `universalAi.model`.
     - Update `chat.defaultModel` to `universal-ai/${providerConfig.defaultModel}` so the chat input immediately activates the chosen model.
     - Fire `onDidChangeLanguageModelChatInformation.fire()` so VS Code immediately updates the Chat Model Picker (Image 3).
     - Update status bar text to `AI: ${provider}`.

3. **Serve Script & Web Caches**:
   - In `scripts/serve-web.mjs`, update any pre-pinned model references to match the active provider and clean model names.
   - Update `workbenchConfig.configurationDefaults` for `chat.defaultModel` with clean identifier.

4. **Verification & Worklog**:
   - Verify code syntax and start fresh server.
   - Update `.worklog/changes/` and `.worklog/CURRENT_STATE.md`.
