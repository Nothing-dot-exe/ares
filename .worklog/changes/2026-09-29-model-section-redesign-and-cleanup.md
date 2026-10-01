# Changes: Model Section Redesign & Fake "Upgrade" Removal

**Date**: 2026-09-29  
**Summary**: Removed fake Copilot `[Upgrade]` placeholder items from the model picker, upgraded model catalog with speed and capability badges, and pinned top-tier models to the top-level list.

---

## 1. Modifications

### Web Bundle ([`.vscode-test-web/.../workbench.web.main.internal.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/.vscode-test-web/vscode-web-insider-e741ab1c964b9fbb11bffed2c0a145af22dad54f/out/vs/workbench/workbench.web.main.internal.js))
- Patched `showUnavailableFeatured: t` to `showUnavailableFeatured: 0`.
- Suppresses unavailable marketing items (`Claude Haiku 4.5 [Upgrade]`, `Claude Sonnet 4.6 [Upgrade]`, `GPT-5.6 Terra [Upgrade]`) from ever being injected into the model picker.

### [`extensions/universal-ai/extension.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/extension.js)
- Redesigned `PROVIDERS` model titles with visual capability & provider tags:
  - `⚡ GPT-OSS 120B (Groq · 128k)`
  - `⚡ Qwen 3.8 27B (Groq · 128k)`
  - `⚡ GPT-OSS 20B (Groq · 128k)`
  - `👁️ Llama 3.2 11B Vision (NVIDIA NIM · 128k)`
  - `🌐 LFM 2.5 2.6B (OpenRouter · Free)`
  - `🌐 Nemotron 3.5 (OpenRouter · Free)`
  - `🔀 Best Coding (OmniRoute Gateway)`
  - `🔀 Best Fast (OmniRoute Gateway)`
  - `🔀 Best Free (OmniRoute Gateway)`
  - `💻 Qwen 2.5 Coder (Local Ollama · Offline)`
  - `💻 Llama 3.2 (Local Ollama · Offline)`
  - `💻 DeepSeek R1 (Local Ollama · Offline)`

### [`scripts/serve-web.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/serve-web.mjs)
- Added `'chat.defaultModel': 'universal-ai/openai/gpt-oss-120b'` to `configurationDefaults` so new chats instantly use Groq 120B.
- Pre-seeded `chatModelPinned` in web storage so top Universal AI models are automatically placed in the top-level pinned section on first load.

---

## 2. Verification
- Verified `index.html` serves `chat.defaultModel` and `chatModelPinned` seed logic.
- Verified `extension.js` serves updated badge titles.
- Verified web server running smoothly on `http://localhost:8080/?ew=true`.
