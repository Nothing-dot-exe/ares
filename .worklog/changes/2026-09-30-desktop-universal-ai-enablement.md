# Changes: Enable Universal AI in Electron Desktop Mode

**Date**: 2026-09-30 22:31
**Author**: Antigravity

## Summary of Changes

Resolved the parity difference between VS Code Web (browser) mode and Code OSS Electron (desktop) mode, ensuring that Universal AI (`vscode.universal-ai`), status bar indicator `$(sparkle) AI: Groq (Ready)`, `@ai` chat participant, model provider registrations, and inline completions function identically across desktop and web.

### 1. Extension Enablement Services
- [extensionEnablementService.ts](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/services/extensionManagement/browser/extensionEnablementService.ts):
  - In `ensureChatExtensionInitialDisabledState()`: Guarded against auto-disabling when `_chatExtensionId` includes `'universal-ai'`.
  - In `_computeEnablementState()`: Explicitly returns `EnablementState.EnabledGlobally` immediately for `vscode.universal-ai` and `custom.universal-ai`.
  - In `_isDisabledInEnv()`: Returns `false` for `vscode.universal-ai` and `custom.universal-ai`.
  - Replicated changes into compiled [out/vs/workbench/services/extensionManagement/browser/extensionEnablementService.js](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/out/vs/workbench/services/extensionManagement/browser/extensionEnablementService.js).

- [extensionEnablementService.ts](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/platform/extensionManagement/common/extensionEnablementService.ts):
  - `getDisabledExtensions()` filters out `vscode.universal-ai` and `custom.universal-ai` so storage state never reports them disabled.
  - `_addToDisabledExtensions()` explicitly ignores `universal-ai` identifiers to prevent runtime disablement.
  - Replicated changes into compiled [out/vs/platform/extensionManagement/common/extensionEnablementService.js](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/out/vs/platform/extensionManagement/common/extensionEnablementService.js).

### 2. Extension Filtering & Proposed APIs
- [abstractExtensionService.ts](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/services/extensions/common/abstractExtensionService.ts):
  - In `filterEnabledExtensions()`: Always keeps `vscode.universal-ai` and `custom.universal-ai` enabled, preventing them from being filtered out during startup.
  - Replicated changes into compiled [out/vs/workbench/services/extensions/common/abstractExtensionService.js](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/out/vs/workbench/services/extensions/common/abstractExtensionService.js).
- [chatParticipant.contribution.ts](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/chatParticipant.contribution.ts):
  - Bypassed proposed API rejection for default chat participant when declared in manifest.
- [languageModels.ts](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/common/languageModels.ts):
  - Marked `universal-ai` as default vendor (`isDefault: item.vendor === COPILOT_VENDOR_ID || item.vendor === 'universal-ai'`).
  - Replicated into compiled [out/vs/workbench/contrib/chat/common/languageModels.js](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/out/vs/workbench/contrib/chat/common/languageModels.js).

### 3. Accounts Service Safeguard
- [defaultAccount.ts](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/services/accounts/browser/defaultAccount.ts):
  - Safely guarded `findMatchingProviderSession()` against `undefined` or empty `allScopes`, preventing unhandled TypeError when authenticating with `universal-ai`.
  - Replicated into compiled [out/vs/workbench/services/accounts/browser/defaultAccount.js](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/out/vs/workbench/services/accounts/browser/defaultAccount.js).

### 4. Desktop Launch & Environment Preparation
- [scripts/prepare-desktop.mjs](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/prepare-desktop.mjs):
  - Added SQLite sanitation using `node:sqlite` `DatabaseSync` to clean `extensionsIdentifiers/disabled` in all `state.vscdb` files.
  - Set `chat.setupContext` to `{"entitlement":2,"installed":true,"disabled":false,"untrusted":false,"disabledInWorkspace":false,"hidden":false,"completed":true}`.
  - Set `builtinChatExtensionEnablementMigration` to `true`.
  - Synced `extensions/universal-ai` to `.vscode-oss-dev/extensions/universal-ai`.
- [scripts/code.bat](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/code.bat):
  - Added `--enable-proposed-api=custom.universal-ai` alongside `vscode.universal-ai`.

### 5. Universal AI Message Normalization
- [extensions/universal-ai/extension.js](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/extension.js):
  - Normalized `LanguageModelChatMessage` content parts to string in `provideLanguageModelChatResponse` to ensure compatibility with Groq/OpenAI endpoints.
  - Synced to `out/extension.js` and `.vscode-oss-dev/extensions/universal-ai/out/extension.js`.
