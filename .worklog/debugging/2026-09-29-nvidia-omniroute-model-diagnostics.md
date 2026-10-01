# Debugging: NVIDIA Fetch Error, OmniRoute Silent Failure & Model Decommissioning

**Date**: 2026-09-29  
**Issue**: 
1. User encountered `Error connecting to NVIDIA: Failed to fetch`.
2. OmniRoute gave no output and no error (empty response).
3. Multiple models failing across Groq, NVIDIA, and OpenRouter.

---

## 1. Root Cause Analysis

### A. NVIDIA "Failed to fetch"
- **Cause**: In `scripts/serve-web.mjs`, the global CORS preflight handler set `Access-Control-Allow-Methods: GET, HEAD, OPTIONS` and lacked `Access-Control-Allow-Headers: Content-Type, Authorization, *`.
- When Chrome in the web worker attempted to POST to `/api/chat`, the OPTIONS preflight was rejected.
- The extension caught this exception and attempted direct client-side fetch to `https://integrate.api.nvidia.com/v1/chat/completions`.
- Because NVIDIA's API lacks `Access-Control-Allow-Origin: *`, Chrome blocked the cross-origin request with `Failed to fetch`.

### B. OmniRoute Empty Output (Silent Failure)
- **Cause**: OmniRoute running locally on `http://127.0.0.1:20128` has 0 configured provider connections (`/api/providers -> {"connections":[],"total":0}`).
- When queried, OmniRoute returns HTTP 200 and streams keepalive frames `{"choices":[{"delta":{}}]}` followed by an SSE error frame:
  `data: {"error":{"message":"oc/deepseek-v4-flash-free: ... Model is unavailable ... [403]: OpenCode's free tier can only be used from within OpenCode ... [429]: Felo thread creation failed"}}`
- In `extensions/universal-ai/extension.js`, the stream reader only checked `json.choices?.[0]?.delta?.content`.
- When `json.error` arrived, `choices` was undefined, so `onChunk` was never called, no error was raised, and the stream terminated cleanly. This resulted in an empty message bubble with no output and no error.

### C. Decommissioned & EOL Models (2026)
- **Groq**:
  - `deepseek-r1-distill-llama-70b` returned HTTP 400 (decommissioned by Groq).
  - `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` returned HTTP 404.
  - Active verified models: `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, and `openai/gpt-oss-20b`.
- **NVIDIA NIM**:
  - `meta/llama-3.1-8b-instruct` and `meta/llama-3.1-70b-instruct` returned HTTP 410 Gone (reached EOL on 2026-08-26).
  - `google/gemma-3-12b-it` returned HTTP 404 (not enabled for account).
  - Active verified model: `meta/llama-3.2-11b-vision-instruct` (HTTP 200 OK with user's key).
- **OpenRouter**:
  - `liquid/lfm-2.5-2.6b:free` (HTTP 200 OK).

---

## 2. Solution Plan
1. **Fix CORS & Preflight in `scripts/serve-web.mjs`**:
   - Add `POST` to `Access-Control-Allow-Methods`.
   - Add `Access-Control-Allow-Headers: Content-Type, Authorization, *`.
   - Handle `OPTIONS` requests returning 204 with full CORS headers.
2. **Handle `json.error` in SSE Stream Parser**:
   - In both `/api/chat` (proxy) and `extension.js`, parse `json.error` and output clear user feedback.
   - For OmniRoute, if the upstream stream returns an error due to missing provider connections, provide a diagnostic tip and automatically failover to Groq (`openai/gpt-oss-120b`) so the user receives a complete answer immediately.
3. **Curate Models in `PROVIDERS`**:
   - Replace decommissioned/EOL models with verified active models across Groq, NVIDIA, and OpenRouter.
