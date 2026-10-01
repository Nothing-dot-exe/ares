# Changes: NVIDIA NIM, OmniRoute Resilience & Model Cleanup

**Date**: 2026-09-29  
**Summary**: Resolved NVIDIA NIM CORS "Failed to fetch" issue, added auto-failover and diagnostics for OmniRoute gateway, and pruned decommissioned/EOL models.

---

## 1. Files Modified

### [`scripts/serve-web.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/serve-web.mjs)
- **CORS Preflight Headers**: Added `POST` to `Access-Control-Allow-Methods`, added `Access-Control-Allow-Headers: Content-Type, Authorization, *`, and `Access-Control-Max-Age: 86400`.
- **NVIDIA Route Handling**: Mapped NVIDIA model to `meta/llama-3.2-11b-vision-instruct` (verified 200 OK with user's key).
- **OmniRoute Gateway Interception & Auto-Failover**:
  - Parsed incoming SSE stream from `http://127.0.0.1:20128`.
  - Detected `{"error": ...}` payloads from upstream sub-providers (e.g. OpenCode 403, Felo 429).
  - Emitted user-friendly markdown warning with diagnostics.
  - Seamlessly auto-failed over to Groq (`openai/gpt-oss-120b`) within the same stream, ensuring zero empty boxes or dead responses.

### [`extensions/universal-ai/extension.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/extension.js)
- **Provider & Model Catalog**:
  - **Groq**: Pruned decommissioned `deepseek-r1-distill-llama-70b` and missing `llama-3.3-70b-versatile`. Retained verified models: `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, and `openai/gpt-oss-20b`.
  - **NVIDIA NIM**: Set default to active verified `meta/llama-3.2-11b-vision-instruct`. Pruned EOL `meta/llama-3.1-8b-instruct`, `meta/llama-3.1-70b-instruct`, and missing `google/gemma-3-12b-it`.
  - **OpenRouter**: Retained verified `liquid/lfm-2.5-2.6b:free` and `nvidia/nemotron-3.5-lightning:free`.
  - **OmniRoute**: Retained `auto/best-coding`, `auto/best-fast`, `auto/best-free`.
- **SSE Stream Error Parser**:
  - Added checks for `json.error` in SSE chunk reader for both proxy and fallback paths.
  - Supported delta content extraction via `delta.content ?? message.content`.

---

## 2. Verification Results
- **CORS Preflight**: Returns HTTP 204 with `Access-Control-Allow-Origin: *`, `POST, GET, HEAD, OPTIONS`, and wildcard headers.
- **NVIDIA NIM**: Connects via proxy to `https://integrate.api.nvidia.com/v1/chat/completions`, returns HTTP 200, and streams tokens.
- **OmniRoute Gateway**: Intercepts sub-provider errors, provides notice, and auto-fails over to Groq seamlessly.
- **Groq**: Streams responses instantly with `openai/gpt-oss-120b`.
