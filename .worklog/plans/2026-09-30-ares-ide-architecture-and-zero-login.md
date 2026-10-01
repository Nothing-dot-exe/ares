# Ares IDE Architecture Plan: Zero-Login & Direct-Endpoint Desktop AI

**Project Name**: Ares (Ares IDE / Ares AI)  
**Date**: 2026-09-30  
**Status**: APPROVED ARCHITECTURE  

---

## 1. Vision & Core Philosophy

**Ares** is an independent, native desktop developer IDE derived from Code OSS that provides:
1. **100% Uncompromised Editor Capabilities**: All standard VS Code capabilities—language services, extension marketplace, terminals, debugging, Git source control, and settings—remain identical and fully functional.
2. **Zero Login / Zero Sign-up**: 
   - **Do NOT just visually hide login buttons or dialogs.**
   - Completely purge Microsoft/GitHub Copilot authentication flows, OAuth ceremonies, entitlement checks, and sign-in modals from the core codebase and AI extensions.
3. **Pure API-Key & Direct-Endpoint Architecture**:
   - Every AI capability (chat, inline edit, tab autocomplete, terminal assistance, agent mode) connects directly to user-supplied endpoints (Ollama Tunnel, Local Ollama, Groq, OpenRouter, NVIDIA NIM, etc.) via secret storage or configuration keys.
   - Zero external account requirements. Zero telemetry or sign-in prompts.
4. **100% Desktop Native**: Runs directly via Electron on Win32 without web servers, local browser tabs, or external browser redirection.

---

## 2. Key Architectural Components

### A. Core Workbench (`src/vs/workbench/contrib/chat/...`)
- **`agentHostAuth.ts`**: Strip out `forceSignInDialog: true` and GitHub Copilot authentication interception. `Agent` mode routes directly to the registered Ares AI language model.
- **`chatSetupProviders.ts`**: Neutralize `SetupAgent` and its 20-second timeout loop. Replace with immediate ready state powered by the active Ares AI provider.
- **Entitlements & Telemetry**: Disable checks against `api.githubcopilot.com`.

### B. Extension Layer (`extensions/universal-ai/` / `ares-ai`)
- **Purge Authentication Contributions**: Remove `authentication` declarations (`universal-ai`, `universal-ai-enterprise`) and `onAuthenticationRequest:*` triggers from `package.json`.
- **In-App Key Management**: API keys are entered directly via the Command Palette (`Ares: Set API Key`) and saved to VS Code's native `context.secrets`.
- **Reasoning Token Streaming**: Full support for both `delta.reasoning` (thinking/cot) and `delta.content` for reasoning models (e.g. DeepSeek-R1, Qwen 3.8 MTP).
- **Default Agent Registration**: Register `isDefault: true`, modes `["agent", "ask", "edit"]`, locations `["panel", "terminal", "notebook", "editor"]`.

### C. Branding & Product Configuration
- Update [`product.json`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/product.json):
  - `nameShort`: "Ares"
  - `nameLong`: "Ares IDE"
  - `applicationName`: "ares"
  - `win32NameVersion`: "Ares IDE"
- Launchers:
  - [`run.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/run.bat): "Starting Ares IDE Native Desktop Application..."
