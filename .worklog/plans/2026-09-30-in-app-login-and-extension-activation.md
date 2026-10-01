# Plan: In-App AI Login System, Authentication Provider & Extension Auto-Activation

**Date**: 2026-09-30  
**Status**: In Progress  

---

## 1. Problem Overview
1. The user reported: *"but extension are not working is there any way like login or api ke so i will provid and extension will work like login system"*.
2. In the Electron desktop environment:
   - `prepare-desktop.mjs` was deleting `universal-ai` from `$env:USERPROFILE\.vscode-oss-dev\extensions`.
   - VS Code scans user extensions using `extensions.json`. If an extension is not registered in `extensions.json`, it is omitted.
   - Built-in extension scanning required proposed APIs to be explicitly allowed in `product.json` for `vscode.universal-ai`.
   - VS Code's `[DefaultAccount]` system logged: `Authentication provider is not available. {"id":"universal-ai","name":"Universal AI"}` because `vscode.authentication.registerAuthenticationProvider('universal-ai', ...)` was not registered.
   - The user needs a clear, seamless "login system" where they can provide their API key (Groq, OpenAI, Anthropic Claude, OpenRouter, NVIDIA, or Custom) or click 1-Click Free AI directly inside VS Code without any external web browser.

---

## 2. Architecture & Design

### A. VS Code Native Authentication Provider (`vscode.authentication`)
- Register `vscode.authentication.registerAuthenticationProvider('universal-ai', 'Universal AI', authProvider, { supportsMultipleAccounts: false })`.
- Provides native VS Code Accounts menu integration (bottom-left person icon).
- `getSessions()`: Returns active session when a key or free provider is configured.
- `createSession()`: Prompts user with interactive in-app QuickPick to select provider, enter API key or choose 1-Click Free AI.
- `removeSession()`: Clears stored credentials and logs out cleanly.

### B. In-App Login Dialog & QuickPick (Zero-Browser)
- QuickPick menu with clear choices:
  1. `⚡ Instant 1-Click Login (Free Groq GPT-OSS 120B & Qwen 27B)`
  2. `🔑 Groq API Key (Recommended - Sub-300ms)`
  3. `🔑 OpenAI API Key (GPT-4o, GPT-4o-mini, o1)`
  4. `🔑 Anthropic / Claude API Key (Claude 3.5 Sonnet, Haiku)`
  5. `🔑 OpenRouter API Key (Unified 200+ models)`
  6. `🔑 NVIDIA NIM API Key (Llama 3.2 Vision & Nemotron)`
  7. `💻 Local Ollama (100% Offline / Local GPU)`
  8. `🌐 Custom OpenAI-Compatible Endpoint`
  9. `🧪 Test Active Connection & Check Latency`
  10. `🚪 Log Out / Clear Saved Keys`
- Secure masked `showInputBox` for key entry.
- Instant connection validation with latency display before saving.

### C. Extension Auto-Activation & Scanning
- Set `"activationEvents": ["*"]` in `extensions/universal-ai/package.json` to activate immediately on boot.
- Register `"vscode.universal-ai"` under `extensionEnabledApiProposals` in `product.json`.
- Pass `--enable-proposed-api=vscode.universal-ai` in `scripts/code.bat`.
- Update `scripts/prepare-desktop.mjs` to keep `universal-ai` synchronized in `$env:USERPROFILE\.vscode-oss-dev\extensions` and ensure its entry exists in `extensions.json`.

---

## 3. Step-by-Step Implementation Plan
1. **Update `extensions/universal-ai/extension.js`**:
   - Implement `vscode.authentication.registerAuthenticationProvider('universal-ai', ...)`.
   - Add Anthropic Claude support in `PROVIDERS` and request handler.
   - Refine `runLoginFlow` with instant 1-click free option, provider key inputs, latency tester, and logout.
   - Sync `out/extension.js`.
2. **Update `extensions/universal-ai/package.json`**:
   - Set `"activationEvents": ["*"]`.
   - Ensure all commands and settings are declared.
3. **Update `product.json`**:
   - Add `"vscode.universal-ai"` to `extensionEnabledApiProposals`.
4. **Update `scripts/code.bat`**:
   - Add `--enable-proposed-api=vscode.universal-ai`.
5. **Update `scripts/prepare-desktop.mjs`**:
   - Sync `universal-ai` to `$env:USERPROFILE\.vscode-oss-dev\extensions\universal-ai`.
   - Write/update `extensions.json` entry so user extension scanner recognises it immediately.
6. **Verification & Testing**:
   - Launch `scripts/code.bat` or `run-electron.bat`.
   - Verify zero browser windows open.
   - Verify Accounts icon shows Universal AI login.
   - Verify status bar shows `$(sparkle) AI: Groq (Ready)`.
   - Verify `@ai` chat and Tab autocomplete work seamlessly.
