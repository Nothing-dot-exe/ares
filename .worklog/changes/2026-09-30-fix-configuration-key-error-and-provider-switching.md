# Change: Fix Configuration Key Error & Instant Provider Switching

**Date**: 2026-09-30  
**Issue**: When clicking the `AI: Groq` button (Image 3) to open the provider selection panel (Image 2) and selecting any provider option, an error notification appeared:
`Unable to write to User Settings because universalAi.universalAi.provider...` and the provider did not change.

---

### Root Cause
1. **Scoped Configuration Key Duplication**:
   - In [`extensions/universal-ai/extension.js`](../../extensions/universal-ai/extension.js):
     ```javascript
     const config = vscode.workspace.getConfiguration('universalAi');
     await config.update('universalAi.provider', selected.label, vscode.ConfigurationTarget.Global);
     await config.update('universalAi.model', PROVIDERS[selected.label].defaultModel, vscode.ConfigurationTarget.Global);
     ```
   - Because `config` was already scoped to `'universalAi'`, passing `'universalAi.provider'` caused VS Code to combine them into `'universalAi.universalAi.provider'`, which does not exist in schema.
   - VS Code rejected the write with an error popup, throwing an exception that blocked `onDidChangeLMInfo.fire()`, `updateStatusBar()`, and model switching.

---

### Solution & Changes
1. **Corrected Configuration Keys**:
   - [`extensions/universal-ai/extension.js`](../../extensions/universal-ai/extension.js):
     - Changed to `await config.update('provider', selected.label, ...)` and `await config.update('model', ...)`.
     - Wrapped the settings write in `try / catch` so any settings sync latency never blocks the UI.
2. **Instant In-Memory Provider Switch**:
   - Introduced `activeProviderName` in [`extensions/universal-ai/extension.js`](../../extensions/universal-ai/extension.js).
   - Instantly updates `activeProviderName`, refreshes the status bar button immediately to `AI: ${selected.label}`, and immediately triggers `onDidChangeLMInfo.fire()`.
   - `provideLanguageModelChatInformation()` immediately returns only the models for the selected provider.
3. **Bypassed Browser Cache (Version 1.0.3 & v3 Path)**:
   - [`extensions/universal-ai/package.json`](../../extensions/universal-ai/package.json): Version bumped to `1.0.3`.
   - [`scripts/serve-web.mjs`](../../scripts/serve-web.mjs): Mounted extension at `/static/extensions/universal-ai-v3` with `no-store, no-cache` headers.
   - Injected pre-boot storage cleanup token `clean_ai_wipe_v8`.
4. **Verified Live Endpoints**:
   - Verified with [`scripts/verify-v3.mjs`](../../scripts/verify-v3.mjs) that `/static/extensions/universal-ai-v3/extension.js` and `package.json` return 200 OK with correct keys and zero errors.
