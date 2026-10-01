# Changes: Restored Original AI Models & @ai Participant (No Ares in AI)

**Date**: 2026-10-01 00:30  
**Author**: Antigravity  

---

## 1. Summary of Changes

1. **Restored Original (OG) AI Models & Vendor**:
   - Reverted AI model vendor and namespace back to `universal-ai` in [`extensions/universal-ai/package.json`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/package.json) and [`extensions/universal-ai/extension.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/extension.js).
   - Chat participant restored to `@ai` (`name: "ai"`, `fullName: "Universal AI"`, `id: "universal-ai.chat"`).
   - Preserved all original model names:
     - Groq: `GPT-OSS 120B (Groq · 128k)`, `Qwen 3.8 27B (Groq · 128k)`, `GPT-OSS 20B`, `Llama 3.3 70B`
     - Ollama (Cloudflare Tunnel): `Qwen 3.8 27B Uncensored (Ollama · Tunnel)`
     - Local Ollama: `Qwen 2.5 Coder (Local Ollama · Offline)`, `DeepSeek R1`, `Llama 3.2`
     - OpenRouter: `LFM 2.5 2.6B`, `Nemotron 3.5`
     - NVIDIA NIM: `Llama 3.2 11B Vision`
   - Removed all "ares" references from AI model identifiers, providers, and chat participants.

2. **Fixed Chat Resolution in Settings**:
   - In user `settings.json`, fixed `"chat.defaultModel"` from invalid `"ares-ai/openai/gpt-oss-120b"` back to `"universal-ai/openai/gpt-oss-120b"`.
   - In [`product.json`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/product.json), restored `defaultChatAgent.provider.default.id` to `"universal-ai"`.
   - Resolves the inability to chat; the chat window immediately connects to the active model.

3. **Desktop Launch & Shortcut Maintained**:
   - `Code OSS.lnk` and `Ares IDE.lnk` on Windows desktop (`C:\Users\kadam\OneDrive\Desktop`) both target native desktop mode via [`run.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/run.bat).
   - Zero browser windows or tabs.
