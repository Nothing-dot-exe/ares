# Plan: Universal AI Provider Architecture (Free Cloud APIs & Local LLMs)

**Date**: 2026-09-29  
**Status**: Proposed Architecture & Roadmap  
**Goal**: Enable AI power in VS Code without GitHub Copilot, supporting NVIDIA NIM, OpenRouter, Groq, and Local LLMs (Ollama).

---

## 💡 The Core Insight: The "OpenAI-Compatible" Standard
Almost all modern AI providers (cloud and local) speak the exact same **OpenAI Chat Completions API protocol** (`/v1/chat/completions`):

| Provider | Endpoint URL | Free Tier / Availability |
| :--- | :--- | :--- |
| **Groq** | `https://api.groq.com/openai/v1` | Free high-speed tier (Llama 3.3 70B, DeepSeek) |
| **OpenRouter** | `https://openrouter.ai/api/v1` | Free models tagged `:free` (Gemini Flash, Llama 3) |
| **NVIDIA NIM** | `https://integrate.api.nvidia.com/v1` | Free credits (Nemotron, Llama 3, DeepSeek) |
| **Local Ollama** | `http://localhost:11434/v1` | 100% Free, Offline, Private on local PC |
| **Local LM Studio** | `http://localhost:1234/v1` | 100% Free, Local GUI model runner |

Because they all share the same protocol, we only need to build **ONE Universal Adapter** that can switch between any of them by changing the `Base URL` and `API Key`.

---

## 🏗 Architecture Blueprint

```text
┌────────────────────────────────────────────────────────┐
│  VS Code Native Chat / Inline Editor (Ctrl+I)          │
└──────────────────────────┬─────────────────────────────┘
                           │ (Prompts & Context)
                           ▼
┌────────────────────────────────────────────────────────┐
│  Universal AI Extension (extensions/universal-ai/)     │
│  - Implements: vscode.lm.registerLanguageModelChatProvider │
│  - Settings:                                           │
│      ai.provider: "Groq" | "OpenRouter" | "NVIDIA" | "Local Ollama" │
│      ai.apiKey: string                                 │
│      ai.model: string                                  │
│      ai.baseUrl: string (auto-filled by provider)      │
└──────────────────────────┬─────────────────────────────┘
                           │ (Streamed SSE request)
                           ▼
┌────────────────────────────────────────────────────────┐
│  Any Chosen Endpoint                                   │
│  - Groq (Ultra-fast cloud)                             │
│  - OpenRouter (Aggregator with free models)            │
│  - NVIDIA NIM (High-performance enterprise models)     │
│  - Local Ollama (localhost:11434)                      │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Step-by-Step Implementation Roadmap

1. **Step 1: Extension Scaffold (`extensions/universal-ai/`)**
   - Create extension structure with `package.json` and TypeScript entry point.
   - Declare settings schema in `configuration` contribution point.

2. **Step 2: Stream Client**
   - Implement HTTP streaming client for `/v1/chat/completions` using Server-Sent Events (`data: {...}`).

3. **Step 3: Registration with `vscode.lm`**
   - Register provider under vendor name (e.g., `'universal-ai'`).
   - Wire `provideLanguageModelChatResponse` to stream chunks into the native VS Code chat response collector.

4. **Step 4: Model Selector & Settings UI**
   - Provide easy presets for Groq, OpenRouter, NVIDIA, and Local Ollama.
