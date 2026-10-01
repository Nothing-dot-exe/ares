# 2026-09-30: Pure Desktop Transition & Browser Removal

## Description
Removed all browser-specific assets and converted `run.bat` to launch the native Code OSS Desktop Electron application directly. All features developed previously (Universal AI, in-app login, API key storage, streaming reasoning tokens, Ollama Tunnel, Groq, OpenRouter, NVIDIA) are now 100% focused on and native to the Desktop Edition.

## Changes & Removals
1. **Removed Browser Assets**:
   - Deleted `.vscode-test-web/` (192 MB of downloaded web assets).
   - Deleted [`scripts/serve-web.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/serve-web.mjs) (HTTP web server script).
2. **Converted [`run.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/run.bat)**:
   - Replaced browser server command with native Desktop Electron launcher (`scripts/prepare-desktop.mjs` + `scripts/code.bat`).
   - Running either `run.bat` or `run-electron.bat` now starts the native Windows Desktop window.
3. **Desktop Shortcut Refresh**:
   - Re-generated `C:\Users\kadam\OneDrive\Desktop\Code OSS.lnk` pointing directly to desktop launcher with native icon.
4. **Desktop Features Preserved**:
   - Native Zero-Browser In-App Authentication & API Key Login inside Code OSS.
   - Status bar AI switcher with instant 1-click model and provider selection.
   - Native `@ai` chat participant with reasoning token support (`qwen3.8-27b-uncensored-mtp`).
   - Ghost-text inline autocomplete (Tab to accept).
