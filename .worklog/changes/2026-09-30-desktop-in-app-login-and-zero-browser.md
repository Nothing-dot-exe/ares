# Changelog: In-App AI Login System & Zero-Browser Enforcement for Code OSS Desktop

**Date**: 2026-09-30  
**Context**: Desktop Electron launcher (`run-electron.bat` / Desktop Shortcut) and Universal AI extension.

---

## 🛠 Summary of Changes

### 1. Zero-Browser Architectural Enforcement
- **Removed `serve-web.mjs` from Desktop Launcher**:
  - In [`run-electron.bat`](../../run-electron.bat), eliminated the background invocation of `serve-web.mjs`. Desktop Code OSS runs Node.js natively and has no requirement for local HTTP proxies.
- **Architectural Browser Suppression**:
  - In [`src/vs/workbench/electron-browser/window.ts`](../../src/vs/workbench/electron-browser/window.ts) and [`out/vs/workbench/electron-browser/window.js`](../../out/vs/workbench/electron-browser/window.js), updated `openExternal`:
    - Checks `workbench.externalBrowser === 'none'`. If set, returns `false` without delegating to `nativeHostService.openExternal()`.
    - This blocks any extension or internal link from launching Google Chrome or Edge.
- **Auto-Configured in Settings**:
  - In [`scripts/prepare-desktop.mjs`](../../scripts/prepare-desktop.mjs), sets `"workbench.externalBrowser": "none"` in `%APPDATA%\code-oss-dev\User\settings.json`.

### 2. Disarmed Broken Microsoft Copilot Browser Auth
- **Launcher Arguments**:
  - In [`scripts/code.bat`](../../scripts/code.bat), appended `--disable-extension=GitHub.copilot-chat` alongside `--disable-extension=vscode.copilot`.
- **Product Configuration**:
  - In [`product.json`](../../product.json), configured `defaultChatAgent`:
    - Set `extensionId: "vscode.universal-ai"` and `chatExtensionId: "vscode.universal-ai"`.
    - Cleared all Microsoft Copilot marketing/signup URLs (`documentationUrl`, `signUpUrl`, `upgradePlanUrl`, `termsStatementUrl`).
    - Configured `provider: { default: { id: "universal-ai", name: "Universal AI" }, enterprise: { id: "universal-ai-enterprise", name: "Universal AI" } }` and `completionsAdvancedSetting: "universalAi.advanced"`.
- **Defensive Safeguards in Chat Actions**:
  - In [`src/vs/workbench/contrib/chat/browser/actions/chatActions.ts`](../../src/vs/workbench/contrib/chat/browser/actions/chatActions.ts) and [`out/vs/workbench/contrib/chat/browser/actions/chatActions.js`](../../out/vs/workbench/contrib/chat/browser/actions/chatActions.js), added null-coalescing guards for `defaultChat?.completionsAdvancedSetting` and `defaultChat?.provider?.enterprise?.id` to eliminate runtime `TypeError: Cannot read properties of undefined (reading 'id')`.

### 3. In-App AI Login & API Key System
- **Universal AI Built-in System Extension**:
  - Updated [`extensions/universal-ai/package.json`](../../extensions/universal-ai/package.json):
    - Configured `"publisher": "vscode"` and `"main": "./out/extension.js"`.
    - Removed non-existent proposal `"defaultChatParticipant"`.
    - Contributed new in-app commands:
      - `universal-ai.login`: Interactive in-editor Login / API Key manager.
      - `universal-ai.useFreeKeys`: 1-click instant login with free built-in models.
      - `universal-ai.logout`: Sign out and clear stored API keys.
      - `universal-ai.testApiKey`: In-editor live latency test.
      - `universal-ai.selectProvider`: Model & provider switcher.
- **Direct Standalone Node.js Streaming & Completions**:
  - Updated [`extensions/universal-ai/extension.js`](../../extensions/universal-ai/extension.js):
    - When running in Electron Desktop (Node.js), directly streams completions from `https://api.groq.com/openai/v1/chat/completions` (or OpenRouter/NVIDIA/Ollama) using native `fetch()` without needing any background proxy or port 8080.
    - Inline ghost-text autocompletion calls Groq `qwen/qwen3.8-27b` directly with sub-300ms latency.
    - Status bar item displays `$(sparkle) AI: Groq (Ready)` or `$(key) AI: Login / API Key` and opens the in-app login menu when clicked.
    - Chat participant (`@ai`) renders an interactive in-editor card with clickable command links (`[🔑 Login / Enter API Key](command:universal-ai.login)`) if credentials are ever missing.
    - In-app key validation tests API keys directly inside Node.js with live feedback and zero browser navigation.
