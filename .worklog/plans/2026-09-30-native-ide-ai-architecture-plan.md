# Architecture Plan: Native Custom AI Engine for Code OSS

## 1. Goal
Transition from patching Microsoft's GitHub Copilot subsystem to building a **clean, first-class, native AI architecture** directly inside your IDE project. The editor will natively own its AI models, chat participants, agent sessions, and inline autocomplete with zero reliance on GitHub/Microsoft paywalls, servers, or legacy setup dialogs.

---

## 2. Core Architectural Principles
1. **Zero Copilot Lock-in**:
   - Decontaminate the chat pipeline from hardcoded `api.githubcopilot.com` endpoints, Microsoft telemetry hooks, and `chatSetup` paywall dialogs.
2. **First-Class Native Service**:
   - Build a native core service (`IAIService` / `IUniversalAIService`) inside `src/vs/workbench/services/ai/` rather than relying on extension wrappers.
3. **Universal LLM Engine**:
   - Native support for OpenAI-compatible streaming endpoints (Remote Ollama Tunnel, Local Ollama, Groq, OpenRouter, NVIDIA NIM) with built-in reasoning token decoding.
4. **Seamless Agent & Chat Parity**:
   - Both normal Chat and Agent Mode (workspace edits) run directly against the selected model (e.g. Qwen 3.8 27B Uncensored) without checking for GitHub licenses.

---

## 3. Step-by-Step Implementation Roadmap

### Phase 1: Decoupling the Core Chat Pipeline
* **Target**: Remove the legacy Copilot Setup / Paywall interceptors that cause "Sign in to use GitHub Copilot" or "Chat took too long to get ready".
* **Key Tasks**:
  1. Replace `SetupAgent` and `chatSetupRunner` with a native **Direct-to-Model Dispatcher**.
  2. Decouple `agentHostAuth` from GitHub OAuth so Agent Mode works directly with any configured model.
  3. Ensure the Chat View initializes in ready state immediately on window load.

### Phase 2: Native Core AI Service (`src/vs/workbench/services/ai/`)
* **Target**: A clean, centralized engine inside the workbench source code.
* **Key Components**:
  1. `AIService`: Manages active providers, models, latency monitoring, and token budgeting.
  2. `AIProviderRegistry`: Clean registration for Ollama Tunnel, Local Ollama, Groq, OpenRouter, and NVIDIA.
  3. `AICredentialStorage`: Secure, 100% in-app key persistence (stored in OS secure store or local config).

### Phase 3: Native Chat & Agent Experience
* **Target**: Modern, responsive chat UI designed for developer productivity.
* **Key Components**:
  1. Default Model Selector integrated directly into the chat prompt toolbar.
  2. Real-time streaming with live thinking/reasoning token visualization (`<think>...</think>`).
  3. Workspace Context Attachment (active files, selection, terminal output) sent cleanly to the active model.

### Phase 4: Native Ghost-Text Autocomplete
* **Target**: Ultra-fast inline code completions (Tab to accept) as you type.
* **Key Components**:
  1. Native editor suggestion provider hooked directly into the language service pipeline.
  2. Configurable debounce (50ms - 150ms) and local/cloud provider routing.

### Phase 5: Branded IDE Identity & Production Build
* **Target**: Your IDE identity (`product.json`, splash screens, icons, executables).
* **Key Components**:
  1. Clean product branding, application names, icons, and menus.
  2. Reliable desktop build configuration (`Code - OSS.exe`).

---

## 4. Verification & Testing Strategy
* End-to-end integration tests verifying zero external network requests to Microsoft/GitHub.
* Automated latency and streaming tests across all configured models.
* Cold-boot performance validation ensuring sub-second chat readiness.
