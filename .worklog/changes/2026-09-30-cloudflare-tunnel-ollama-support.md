# 2026-09-30: Cloudflare Tunnel Ollama Endpoint Support & Reasoning Streaming

## Description
Added full native support for the remote Cloudflare Tunnel Ollama endpoint (`https://nitrogen-tagged-cradle-specifications.trycloudflare.com`) hosting the uncensored reasoning model `qwen3.8-27b-uncensored-mtp`.

## Files Modified
- [`extensions/universal-ai/extension.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/extension.js)
- [`extensions/universal-ai/out/extension.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/out/extension.js)
- [`extensions/universal-ai/package.json`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/package.json)
- [`scripts/serve-web.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/serve-web.mjs)
- [`scripts/prepare-desktop.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/prepare-desktop.mjs)

## Key Implementations
1. **Endpoint & Provider Registration**:
   - Added `'Ollama (Tunnel)'` provider with base URL `https://nitrogen-tagged-cradle-specifications.trycloudflare.com/v1`.
   - Registered models `qwen3.8-27b-uncensored-mtp` and `hf.co/JonathanColetti/Qwen3.8-27B-Uncensored-GGUF:Q4_K_M`.
   - Configured zero-authentication requirements (similar to Local Ollama, bypasses login prompt).
2. **Reasoning Token Streaming**:
   - Updated `streamChatCompletion` to capture both `delta.reasoning` / `delta.reasoning_content` and standard `delta.content`.
   - Prevents UI from hanging while Qwen 3.8 / DeepSeek R1 models think.
3. **UI Integration**:
   - Added status bar indicator: `$(cloud) AI: Qwen 3.8 (Tunnel)` when active.
   - Added quick pick option in `universal-ai.login` and `universal-ai.selectProvider`.
   - Included in automated multi-provider latency test suite.
4. **Desktop & Web Parity**:
   - Synchronized build output to `.vscode-oss-dev/extensions/universal-ai`.
   - Added proxy routing in `scripts/serve-web.mjs` for browser mode compatibility.
