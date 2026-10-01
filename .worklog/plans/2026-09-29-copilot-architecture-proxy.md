# Plan & Architecture: Copilot-Style Language Model Streaming Proxy

**Date**: 2026-09-29  
**Author**: Antigravity Agent  
**Goal**: Mirror GitHub Copilot's architecture in VS Code by routing LLM requests through a local streaming backend proxy, completely eliminating browser CORS blocks and sandbox failures.

---

## 🏗 Architectural Comparison

### Standard Direct Client Fetch (Fragile):
```
[Browser Chrome (localhost:8080)]
  └─► fetch('https://integrate.api.nvidia.com') ──► BLOCKED by Chrome CORS (No ACAO header)
  └─► fetch('http://127.0.0.1:20128') ───────────► 502 / Private Network Access / Preflight Issues
```

### Copilot-Style Backend Proxy (Robust & Reliable):
```
[Browser Chrome (localhost:8080)]
  │  (Same-Origin Request: zero CORS restrictions, zero browser blocking)
  ▼
[Node.js Server (/api/chat on localhost:8080)]
  ├─► Reads credentials directly from .keys.json
  ├─► Selects target provider (Groq / NVIDIA / OpenRouter / OmniRoute / Ollama)
  ├─► Handles streaming HTTP connections server-side with Node.js
  ├─► Provides intelligent fallback (e.g. Groq 404 auto-retry with GPT-OSS)
  │
  └─► Streams SSE tokens directly back to workbench (real-time chunking)
```

---

## 🚀 Key Advantages

1. **Immunity to Browser Sandbox & CORS Restrictions**:
   No external provider needs to support browser CORS. NVIDIA NIM, OpenRouter, Groq, and local OmniRoute connect via Node.js backend.
2. **Secure Credential Handling**:
   Keys remain protected on the host system in `.keys.json` and are not exposed in browser client inspection.
3. **Resilient Failover**:
   The proxy automatically handles upstream 404s, 502s, or rate limits by rerouting or delivering human-readable diagnostic guidance.
