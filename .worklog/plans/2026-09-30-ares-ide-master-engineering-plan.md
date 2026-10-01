# ARES IDE — Master Engineering & Transformation Plan

**Date**: 2026-09-30  
**Status**: APPROVED & IN PROGRESS  
**Target Product**: ARES IDE (Desktop-First, AI-Native, Zero-Login)

---

## 1. Executive Summary

This plan details the full transformation of Code - OSS into **Ares IDE** with its native **Ares AI** subsystem, satisfying the Master Engineering Specification.

The core guiding principle is:
> **Standard IDE functionality remains standard. AI authentication does not.**

---

## 2. Audit Findings & Dependency Map

### Current State
1. **Product Configuration (`product.json`)**:
   - `nameShort` and `nameLong` currently "Code - OSS".
   - `defaultChatAgent` configured to `vscode.universal-ai`.
   - `builtInExtensionsEnabledWithAutoUpdates` contains `GitHub.copilot-chat`.
2. **AI Extension (`extensions/universal-ai`)**:
   - Hardcoded API keys exist in `extension.js` (`EMBEDDED_KEYS`) - violates security specs.
   - Participant name is `ai` instead of `@ares`.
   - Streaming currently treats reasoning tokens and content with basic fallback; needs explicit reasoning/content distinction.
   - Configuration title and commands still labeled "Universal AI" instead of "Ares AI".
   - Default provider should be Ollama Cloudflare Tunnel (`qwen3.8-27b-uncensored-mtp`) with zero-login requirement.
3. **Core Chat Setup (`chatSetupProviders.ts`, `chatSetupRunner.ts`, `agentHostAuth.ts`)**:
   - `agentHostAuth.ts` triggers `forceSignInDialog: true` with "Sign in to use GitHub Copilot".
   - `chatSetupProviders.ts` contains a 20-second timeout that displays "Chat took too long to get ready" and prompts for Copilot login.
   - `chatSetupContributions.ts` registers Copilot-specific titlebar and account menu actions.
4. **Desktop Launcher (`scripts/prepare-desktop.mjs`, `run.bat`)**:
   - Sets initial settings, currently configured to `universalAi.*` instead of cleanly defaulting to Ares AI Tunnel Ollama.

### Dependency Flow Map

```text
Chat UI (@ares)
   ↓
Language Models Service (registerLanguageModelChatProvider 'ares-ai')
   ↓
Ares AI Provider Manager (IAresAIProvider)
   ├── RemoteOllamaProvider (Cloudflare Tunnel: https://nitrogen-tagged-cradle-specifications.trycloudflare.com/v1)
   ├── LocalOllamaProvider (http://localhost:11434/v1)
   ├── GroqProvider (https://api.groq.com/openai/v1)
   ├── OpenRouterProvider (https://openrouter.ai/api/v1)
   └── NvidiaNimProvider (https://integrate.api.nvidia.com/v1)
   ↓
Streaming SSE Parser (handles delta.reasoning + delta.content, cancellation, keep-alives)
   ↓
Model Output -> Chat UI / Ghost-Text Inline Autocomplete
```

---

## 3. Step-by-Step Implementation Strategy

### Phase 1: Core Product Identity & Branding
1. Update [`product.json`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/product.json):
   - Set `nameShort`: "Ares", `nameLong`: "Ares IDE".
   - Set `win32DirName`: "Ares IDE", `win32NameVersion`: "Ares IDE".
   - Clean `defaultChatAgent` and `extensionEnabledApiProposals` to reference Ares AI.
   - Remove `GitHub.copilot-chat` from `builtInExtensionsEnabledWithAutoUpdates`.
2. Update [`run.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/run.bat) and launcher scripts to clearly brand Ares IDE.

### Phase 2: Elimination of Copilot Setup & Readiness Timeouts
1. Neutralize `agentHostAuth.ts` Copilot OAuth interceptions so Agent mode operates directly through the active model without sign-in dialogs.
2. In `chatSetupProviders.ts`:
   - Replace Copilot timeout warnings with instant provider readiness check.
   - Report "Ares AI — Provider unavailable" only if actual connection fails, rather than generic 20s Copilot timeout.
3. In `chatSetupContributions.ts`:
   - Remove Copilot-specific sign-in actions from the accounts menu.
   - Preserve standard Git authentication for GitHub repositories completely intact.

### Phase 3: Ares AI Provider Architecture & Security Overhaul
1. Completely remove hardcoded keys from `extensions/universal-ai/extension.js`.
2. Implement secure key resolution:
   - Priority 1: VS Code SecretStorage (`context.secrets`).
   - Priority 2: Local `.keys.json` (gitignored, existing).
3. Implement clean `IAresAIProvider` abstraction:
   - `RemoteOllamaProvider`: Default tunnel endpoint `https://nitrogen-tagged-cradle-specifications.trycloudflare.com/v1`, model `qwen3.8-27b-uncensored-mtp`. Zero auth required.
   - `LocalOllamaProvider`: `http://localhost:11434/v1`.
   - `GroqProvider`: `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, etc.
   - `OpenRouterProvider`: Configurable models.
   - `NvidiaNimProvider`: NVIDIA NIM endpoints.
4. Robust Streaming Engine:
   - Dissect and support both `delta.reasoning` (or `delta.reasoning_content`) and `delta.content`.
   - Support `CancellationToken` cancellation with immediate connection termination.
   - Resilient SSE parsing: tolerate keep-alives, malformed chunks, and `[DONE]`.

### Phase 4: UX & Chat Participant (`@ares`)
1. Brand participant as `@ares` with `isDefault: true`, modes `["agent", "ask", "edit"]`, locations `["panel", "terminal", "notebook", "editor"]`.
2. Add inline completion with debouncing (80ms), cancellation support, and non-blocking failure modes.
3. Update Status Bar to show:
   - `$(cloud) Ares AI: Qwen 3.8 (Tunnel)`
   - `$(sparkle) Ares AI: Groq (Ready)`
   - `$(circle-slash) Ares AI: Offline`
4. Native QuickPick for provider switching, key management, and latency testing without browser windows.
5. Update `extensions/universal-ai/package.json` with Ares AI metadata and commands.
6. Synchronize with `prepare-desktop.mjs` to ensure the desktop environment uses the updated extension and settings.

### Phase 5: Verification & End-to-End Validation
1. Verify launcher and desktop startup.
2. Test chat interaction with Remote Tunnel Ollama without login.
3. Test provider switching to Groq, Local Ollama, OpenRouter, NVIDIA NIM.
4. Verify inline code completion ghost-text.
5. Confirm no leaks of API keys in logs, output, or chat.
6. Ensure standard IDE features (Git, terminal, debugger, language servers) are fully unaffected.
