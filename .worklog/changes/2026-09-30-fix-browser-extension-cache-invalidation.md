# Change: Fix Browser Extension Cache Invalidation & Pure Clean Model Selection

**Date**: 2026-09-30  
**Issue**: The user refreshed the browser, but models still had emoji prefixes (`⚡`, `👁️`, `🌐`, `🔀`, `💻`), the status bar still had sparkles/lightning (`✨ AI: Groq ⚡`), and the chat model picker had models from all providers pinned.

---

### Root Cause
1. **VS Code Web Extension Caching (`vscode-web-db` / `additionalBuiltinExtensions`)**:
   - The builtin extension was declared with path `/static/extensions/universal-ai` and version `1.0.0`.
   - VS Code Web scans builtin extensions once and caches their metadata and entry points in IndexedDB (`vscode-web-db` and `vscode-web-state-db-global`).
   - Standard browser refreshes (`F5`) do not invalidate IndexedDB extension records, causing VS Code to run the old cached `extension.js`.
2. **Language Models Cache (`chat.cachedLanguageModels.v2`)**:
   - VS Code caches language models across sessions in `chat.cachedLanguageModels.v2`.
   - On boot, `mergeModelsWithCache()` re-injects previously cached models (with emoji prefixes) before live models finish registering.
3. **Hardcoded Multi-Provider Pinning**:
   - `serve-web.mjs` was populating `chatModelPinned` with models from Groq, NVIDIA, OpenRouter, and OmniRoute on startup, preventing the chat model picker from strictly showing only the active provider's models.

---

### Key Changes
1. **Extension Cache Breaking & Version Bump**:
   - [`extensions/universal-ai/package.json`](../../extensions/universal-ai/package.json):
     - Bumped version to `1.0.2`.
   - [`scripts/serve-web.mjs`](../../scripts/serve-web.mjs):
     - Updated `additionalBuiltinExtensions` path to `/static/extensions/universal-ai-v2`.
     - Added server route supporting `/static/extensions/universal-ai-v2/` with `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`, `Pragma: no-cache`, `Expires: 0`.
2. **Automated Browser Storage Purge**:
   - [`scripts/serve-web.mjs`](../../scripts/serve-web.mjs):
     - Removed hardcoded multi-provider `defaultPinned` list.
     - Added automatic pre-boot purge of `chat.cachedLanguageModels`, `chatModelPinned`, `chat.modelConfiguration`, `additionalBuiltinExtensions`, and `DEFAULT_OVERRIDES`.
     - Injected automated IndexedDB database flush for `state-db` and `vscode-web` on version change to discard stale caches cleanly.
3. **Pure Clean Status Bar & Models (Zero Icons)**:
   - [`extensions/universal-ai/extension.js`](../../extensions/universal-ai/extension.js):
     - Removed `chatParticipant.iconPath = new vscode.ThemeIcon('sparkle')`.
     - Status bar button strictly shows `AI: ${provider}` with no codicons or emojis.
     - Model names cleanly formatted with zero emoji prefixes.
     - `universal-ai.selectProvider` dynamically switches active provider models and updates `chat.defaultModel`.

---

### Verification
- `curl http://localhost:8080/static/extensions/universal-ai-v2/extension.js`:
  - Verified `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`.
  - Verified `statusBarItem.text = 'AI: ${provider}';` (no sparkles, no zap).
  - Verified model names have no emojis.
- `curl http://localhost:8080/static/extensions/universal-ai-v2/package.json`:
  - Verified `version: "1.0.2"`.
- Verified server restarted cleanly on PID `task-2276`.
