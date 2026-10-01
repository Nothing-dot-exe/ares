# Change Log: Cache Buster & Universal Enablement Default for Status Dashboard

**Date**: 2026-09-29  
**Type**: Bug Fix & Cache Resolution  
**Author**: AI Assistant

---

## 📌 Problem Statement
The user reported that the popup in their browser still showed `Disabled` and contained the Microsoft *"Set up Copilot to use AI features."* / *"[ Use AI Features ]"* prompt.

### Root Causes
1. **Aggressive Browser Caching**:
   - `scripts/serve-web.mjs` was returning `Cache-Control: public, max-age=3600` for all static assets.
   - When Chrome refreshed the tab, it served `workbench.web.main.internal.js` directly from disk cache, running the old unpatched code.
2. **Missing Default Value in `isCompletionsEnabledFromObject` (`HWt`)**:
   - In VS Code, when `github.copilot.enable` is unconfigured (because the official Microsoft extension is not installed), `HWt` defaulted to `false`.
   - This evaluated the status text to `Disabled` and unchecked the checkboxes unless explicitly overridden.

---

## 📂 Applied Fixes

1. **Cache Buster in [`scripts/serve-web.mjs`](../../scripts/serve-web.mjs)**:
   - Added dynamic timestamp query parameter `?v=${Date.now()}` to:
     - `/static/build/out/vs/workbench/workbench.web.main.internal.js`
     - `/static/build/out/vs/workbench/workbench.web.main.internal.css`
     - `/static/build/out/nls.messages.js`
   - Replaced `Cache-Control: public, max-age=3600` with `no-store, no-cache, must-revalidate, max-age=0` and `Pragma: no-cache`.

2. **Default Enablement in Web Bundle & Source**:
   - Patched `HWt` in [`workbench.web.main.internal.js`](../../.vscode-test-web/vscode-web-insider-e741ab1c964b9fbb11bffed2c0a145af22dad54f/out/vs/workbench/workbench.web.main.internal.js):
     ```javascript
     function HWt(s,o="*"){return bi(s)?typeof s[o]<"u"?!!s[o]:typeof s["*"]<"u"?!!s["*"]:!0:!0}
     ```
   - Updated [`src/vs/editor/common/services/completionsEnablement.ts`](../../src/vs/editor/common/services/completionsEnablement.ts) to return `true` by default when the setting is undefined.

3. **Server Reboot**:
   - Restarted `run.bat` in background (`task-1421`).
   - Verified that HTTP responses serve the cache-busted URL and `no-store` headers.
