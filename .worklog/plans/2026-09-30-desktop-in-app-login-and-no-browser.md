# Plan: In-App AI Login / API Key System & Strict Zero-Browser Enforcement for Code OSS Desktop

**Date**: 2026-09-30  
**Target**: Code OSS Electron Desktop Application (`run-electron.bat` / Desktop Shortcut)  
**Goal**:
1. Completely prevent any external browser (Chrome / Edge) from opening when launching or using the desktop application.
2. Provide a seamless, in-app "Login / API Key" system for AI so the user can easily provide their API key directly inside VS Code (like a login system) or use the pre-configured free AI without any browser login.
3. Fix all extension loading and activation issues in Code OSS desktop so extensions (AI, Python, Git, Terminal, etc.) work without errors.

---

## 🔍 Root Cause Breakdown

1. **Why Browser Opened**:
   - `scripts/serve-web.mjs` was being started by `run-electron.bat`. Desktop Electron runs Node.js natively and has zero need for a background web server.
   - `product.json` had `defaultChatAgent` configured for Microsoft GitHub Copilot. When opening Chat or checking accounts, VS Code initiated GitHub OAuth sessions which invoked `openExternal()` -> launching Google Chrome to GitHub's web login page.
   - `GitHub.copilot-chat` in `extensions/copilot` was throwing `Error: The default value for setting chat.responsesApi.promptCacheBreakpoint.enabled is different in packageJson and in code` because it expects internal Microsoft configurations and paid Copilot subscriptions.
   - `scripts/code.bat` was only disabling `vscode.copilot`, leaving `GitHub.copilot-chat` to crash and trigger browser login popups.

2. **Why Extensions Were "Not Working"**:
   - User extensions in `$env:USERPROFILE\.vscode-oss-dev\extensions` were missing the actual folders for Python (`ms-python.python`, `ms-python.vscode-pylance`, etc.) even though they were declared in `extensions.json`.
   - The AI extension lacked a high-visibility, 1-click "Login / Enter API Key" interface in the status bar and chat panel.
   - Universal AI's inline completion was attempting to reach `/api/complete` on port 8080 instead of calling the provider API directly in desktop Node.js.

---

## 🛠 Step-by-Step Implementation Plan

### Step 1: Remove `serve-web.mjs` from Desktop Launcher (`run-electron.bat`)
- In [`run-electron.bat`](../../run-electron.bat), completely remove starting `serve-web.mjs`.
- The desktop app is 100% self-contained and runs Node.js natively. No web server or port 8080 is needed.

### Step 2: Disable Broken Microsoft Copilot Extensions in Launcher (`scripts/code.bat`)
- In [`scripts/code.bat`](../../scripts/code.bat), append `--disable-extension=GitHub.copilot-chat` alongside `--disable-extension=vscode.copilot`.
- Pass `--extensions-dir "%USERPROFILE%\.vscode\extensions"` or ensure `.vscode-oss-dev\extensions` is fully populated.

### Step 3: Configure `product.json` to Prevent GitHub Browser Login
- In [`product.json`](../../product.json), update `defaultChatAgent`:
  - Set `chatExtensionId` to `custom.universal-ai`.
  - Remove external redirect URLs (`signUpUrl`, `upgradePlanUrl`, `documentationUrl`) so VS Code never attempts to open browser tabs for AI accounts.

### Step 4: Build Comprehensive In-App "AI Login & API Key" System in Universal AI
- Enhance [`extensions/universal-ai/extension.js`](../../extensions/universal-ai/extension.js) and [`package.json`](../../extensions/universal-ai/package.json):
  1. **Status Bar Login Indicator**:
     - Displays `$(key) AI: Login / API Key` (if no key set) or `$(sparkle) AI: <Provider> (Logged In)`.
     - Clicking it opens the in-app AI Account & Key Manager.
  2. **In-App Login Commands**:
     - `universal-ai.login`: InputBox for entering any API key (Groq, OpenAI, Anthropic, OpenRouter, NVIDIA, Custom).
     - `universal-ai.useFreeKeys`: 1-click instant login using pre-configured free Groq 120B / OpenRouter / NVIDIA keys.
     - `universal-ai.testApiKey`: In-editor connection latency test (checks directly from Node.js, no browser!).
     - `universal-ai.logout`: Clear keys and reset to default.
  3. **Direct Standalone Node.js Streaming & Completions**:
     - In desktop mode, perform `fetch()` directly to provider endpoints without relying on port 8080 proxy.
  4. **In-Chat Login Card**:
     - If the user uses Chat without credentials, display an in-chat login button `[🔑 Login / Enter API Key]` that triggers the in-app input box directly.

### Step 5: Prevent External Browser Launches in Desktop Window
- Configure `settings.json` in `prepare-desktop.mjs` to block external browser triggers.
- In `src/vs/workbench/electron-browser/window.ts`, ensure `openExternal` checks and avoids opening browser tabs if the user is in desktop mode.

### Step 6: Sync User Extensions in `prepare-desktop.mjs`
- In [`scripts/prepare-desktop.mjs`](../../scripts/prepare-desktop.mjs), add an automatic sync from `$env:USERPROFILE\.vscode\extensions` to `$env:USERPROFILE\.vscode-oss-dev\extensions` on launch so Python, Pylance, etc. are always present.

### Step 7: Verification & Testing
- Launch Code OSS via `run-electron.bat`.
- Verify:
  - Zero browser windows open.
  - No `GitHub.copilot-chat` activation error in exthost.log.
  - Status bar shows `AI: Logged In (Groq)` or `AI: Login / API Key`.
  - Running `AI: Login / Enter API Key` opens the input box inside Code OSS.
  - Chat `@ai` responds directly inside the editor.
  - Ghost-text autocomplete works with <kbd>Tab</kbd>.
  - Python / Pylance extensions activate cleanly.
