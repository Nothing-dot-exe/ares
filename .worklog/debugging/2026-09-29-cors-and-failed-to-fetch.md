# Debugging: "Failed to fetch" on NVIDIA and Empty Output on OmniRoute

**Date**: 2026-09-29  
**Symptoms**:
1. NVIDIA: `❌ Error connecting to NVIDIA: Failed to fetch`.
2. OmniRoute: Empty response output when submitting prompts.

---

## 🔍 Root Cause Analysis

1. **NVIDIA NIM CORS Absence**:
   - `https://integrate.api.nvidia.com/v1/chat/completions` responds to preflight OPTIONS requests without the `Access-Control-Allow-Origin` header (`CORS headers: null`).
   - Modern browsers (Google Chrome) strictly block JavaScript client requests when this header is omitted, manifesting as `"Failed to fetch"`.

2. **OmniRoute Upstream Configuration Requirements**:
   - OmniRoute is a multi-provider router. Calling `auto/best-fast` or `auto/best-coding` returned upstream error `502: [402/400]: This model requires an opencode API key in Settings -> Providers`.
   - The raw browser stream did not surface the upstream error clearly in the chat stream.

---

## 🛠 Resolution

1. **Backend Streaming Proxy Endpoint**:
   - Implemented `POST /api/chat` in [`scripts/serve-web.mjs`](../../scripts/serve-web.mjs).
   - Serves as a same-origin proxy on `http://localhost:8080/api/chat`.
   - Node.js executes the upstream requests to NVIDIA and OmniRoute server-side with zero CORS restrictions.
   - Tested NVIDIA streaming over `/api/chat`: **Status 200 OK**, 2001 bytes of streaming tokens received.
   - Tested Groq streaming over `/api/chat`: **Status 200 OK**, 21323 bytes of streaming tokens received.

2. **Extension Client Integration**:
   - Updated [`extensions/universal-ai/extension.js`](../../extensions/universal-ai/extension.js) to call `/api/chat` as its primary transport, falling back to direct fetch only if the proxy is unavailable.
