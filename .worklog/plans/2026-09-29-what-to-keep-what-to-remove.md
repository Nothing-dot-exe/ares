# Architectural Audit: What to Keep, What to Remove, and What Connects

**Date**: 2026-09-29  
**Goal**: Remove Copilot dependencies and seamlessly connect our Universal AI to the native Language Models Management UI and Chat.

---

## 1. 🟢 What We KEEP (The Core System)

The core VS Code workbench is already built to support custom language models:

| Component | Location | Role |
| :--- | :--- | :--- |
| **Language Models Table** | [`src/vs/workbench/contrib/chat/browser/chatManagement/chatModelsWidget.ts`](../../src/vs/workbench/contrib/chat/browser/chatManagement/chatModelsWidget.ts) | The exact UI from your screenshot that lists models, context sizes, and capabilities. |
| **Language Models Service** | [`src/vs/workbench/contrib/chat/common/languageModels.ts`](../../src/vs/workbench/contrib/chat/common/languageModels.ts) | The central hub (`ILanguageModelsService`) that registers providers, counts tokens, and routes chat requests. |
| **Extension API Bridge** | [`src/vs/workbench/api/common/extHostLanguageModels.ts`](../../src/vs/workbench/api/common/extHostLanguageModels.ts) | Exposes `vscode.lm` to extensions. |
| **Native Chat Panel & Inline Diff** | [`src/vs/workbench/contrib/chat/`](../../src/vs/workbench/contrib/chat/) | The chat sidebar, `@` participants, slash commands, and inline editor (`Ctrl+I`). |

---

## 2. 🔴 What We REMOVE / DISCONNECT (Copilot Artifacts)

| Item | Location | Reason |
| :--- | :--- | :--- |
| **Copilot Extension** | [`extensions/copilot/`](../../extensions/copilot/) | The GitHub Copilot extension requiring GitHub login and subscriptions. Can be disabled or removed. |
| **Root Build Scripts** | [`package.json`](../../package.json) | `compile-copilot`, `watch-copilot`, `copilot:setup` build hooks. |
| **Root Dependencies** | [`package.json`](../../package.json) | `@github/copilot-sdk`, `@vscode/copilot-api`. |
| **Entitlement Gates** | `chatEntitlementService` checks | Any gate that checks for GitHub Copilot subscription before enabling model configuration. |

---

## 3. 🔵 What We ADD (Universal AI Provider)

| Item | Location | Role |
| :--- | :--- | :--- |
| **Universal AI Extension** | `extensions/universal-ai/` | Built-in provider extension. |
| **Provider Registration** | `vscode.lm.registerLanguageModelChatProvider` | Hooks directly into `ILanguageModelsService`. |
| **Streaming Client** | `src/streamClient.ts` | Dispatches `/v1/chat/completions` requests to Groq, OpenRouter, NVIDIA, or Ollama and streams back response tokens. |
| **Model Catalog** | `src/models.ts` | Populates the Language Models table with free cloud and local models. |
