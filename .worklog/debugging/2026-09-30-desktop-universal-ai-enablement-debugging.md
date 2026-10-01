# Debugging: Universal AI Desktop Enablement & Parity

**Date**: 2026-09-30 22:33
**Status**: Resolved

## 1. Symptoms & Observed Issues
1. When launched via `run-electron.bat` / desktop shortcut, the window showed "Code - OSS Dev" with no status bar AI indicator `$(sparkle) AI: Groq (Ready)`.
2. In contrast, VS Code Web (`http://localhost:8080`) showed full AI features:
   - Status bar item `$(sparkle) AI: Groq (Ready)`
   - `@ai` chat participant
   - Models available in chat picker: Groq (GPT-OSS 120B, Qwen 3.8 27B, Llama 3.3 70B), OpenRouter, NVIDIA, Ollama
3. User requested complete feature parity between Desktop and Browser modes.

## 2. Root Cause Analysis
1. **Chat Entitlement Migration Disabling Universal AI**:
   - `ensureChatExtensionInitialDisabledState()` in `extensionEnablementService.ts` checked `this._chatExtensionId` (`vscode.universal-ai`).
   - Because Universal AI uses API keys and not Microsoft Copilot cloud account entitlements, `context.value.state.completed` was `false`.
   - VS Code called `this._disableExtension({ id: 'vscode.universal-ai' })` on first boot, persisting `'vscode.universal-ai'` into `extensionsIdentifiers/disabled` inside `state.vscdb`.
   - On all subsequent boots, `filterEnabledExtensions()` read `getEnablementStates()` and excluded `vscode.universal-ai` from the extension host.

2. **`prepare-desktop.mjs` Cleaning User Extensions**:
   - Previous versions of `prepare-desktop.mjs` actively deleted `.vscode-oss-dev/extensions/universal-ai` and pruned it from `extensions.json`.

3. **`allScopes.some` TypeError in `defaultAccount.ts`**:
   - `DefaultAccount.findMatchingProviderSession()` assumed `allScopes` was always defined as an array of scope arrays. When `product.json` did not configure scopes for `universal-ai`, `allScopes.some(...)` threw `TypeError: Cannot read properties of undefined (reading 'some')`.

4. **Redundant `let enablementState` SyntaxError**:
   - During manual patching of `out/vs/workbench/services/extensionManagement/browser/extensionEnablementService.js`, `let enablementState` was redeclared, causing workbench startup to crash.

5. **`LanguageModelChatMessage` Content Parsing in Groq Stream**:
   - `LanguageModelChatMessage.User(...)` passes `m.content` as an array of `LanguageModelTextPart` objects. The JSON serializer passed `[{"value": "..."}]` instead of a string, causing Groq to reject with `API Error 400: value must be a string`.

## 3. Resolution & Verification
1. Patched `extensionEnablementService.ts` and `out/...`:
   - `ensureChatExtensionInitialDisabledState()` skips if `_chatExtensionId.includes('universal-ai')`.
   - `_computeEnablementState()` returns `EnablementState.EnabledGlobally` immediately.
   - `filterEnabledExtensions()` preserves `vscode.universal-ai` unconditionally.
   - `getDisabledExtensions()` filters out `universal-ai`.
2. Added SQLite sanitation in `prepare-desktop.mjs` to clear `extensionsIdentifiers/disabled` and set `chat.setupContext` to completed/enabled.
3. Guarded `allScopes` in `defaultAccount.ts` and `out/...`.
4. Fixed duplicate declaration syntax error in `extensionEnablementService.js`.
5. Normalized message parts in `extensions/universal-ai/extension.js`.
6. Verified via live CDP inspection (`scripts/verify-desktop-ai.mjs`) and end-to-end LLM request test (`scripts/test-chat-request.mjs`):
   - `vscode.universal-ai` is active in `exthost`.
   - All 7 AI commands are registered.
   - All 4 Groq models are loaded and respond to chat requests.
