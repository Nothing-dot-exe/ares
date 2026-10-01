# Changelog: Fix Inline Suggestions Enable/Disable Toggle Logic & Auto-On Defaults

**Date**: 2026-09-30  
**Author**: AI Assistant  
**Task**: Fix Enable/Disable toggle button and checkboxes so they never auto-enable, toggle reliably back and forth (OFF ↔ ON), and match native VS Code behavior.

---

## 📝 Files Modified

1. **[`extensions/universal-ai/package.json`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/package.json)**
   - Changed default for `github.copilot.enable` from `{"*": true}` to `{"*": false}`.
   - Changed default for `github.copilot.nextEditSuggestions.enabled` from `true` to `false`.
   - Result: Extensions no longer declare inline suggestions as auto-enabled by default.

2. **[`extensions/universal-ai/extension.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/extension.js)**
   - Updated `provideInlineCompletionItems` check to strictly verify that `github.copilot.enable['*'] === true` or language is explicitly `true` before issuing completion requests.

3. **[`scripts/serve-web.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/serve-web.mjs)**
   - Set workbench configuration defaults:
     - `'github.copilot.enable': { '*': false }`
     - `'editor.inlineSuggest.enabled': false`
     - `'github.copilot.nextEditSuggestions.enabled': false`
   - Added cache-purge logic in HTML template `<script>` to purge stale localStorage keys (`vscode.configuration.defaults`, `DEFAULT_OVERRIDES_CACHE_EXISTS_KEY`) from prior sessions.

4. **[`src/vs/editor/common/services/completionsEnablement.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/editor/common/services/completionsEnablement.ts)**
   - Updated `isCompletionsEnabledFromObject` to return `false` (disabled) by default when no configuration object exists, giving users full manual control.

5. **[`src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusDashboard.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusDashboard.ts)**
   - Updated `renderSetupSection`:
     - Solved frozen object mutation: cloned `cur` with `{ ...cur }` so strict mode does not throw `TypeError: Cannot assign to read only property '*'`.
     - When disabling: sets all language keys and `*` to `false`.
     - Synchronizes `editor.inlineSuggest.enabled` with target state.
     - Updates button label (`Disable Inline Suggestions` ↔ `Enable Inline Suggestions`) and description text.
   - Updated `getCompletionsSettingAccessor`:
     - Clones configuration object and propagates `editor.inlineSuggest.enabled` synchronously when checkboxes are clicked directly.

6. **[`src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusEntry.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusEntry.ts)**
   - Updated `getEntryProps`:
     - Falls back to global enablement check when no editor is focused so `$(copilot-unavailable)` is correctly shown when disabled.

7. **[`scripts/patch-chat-status.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/patch-chat-status.mjs)**
   - Updated patch script to inject the safe cloning bidirectional toggle logic into `.vscode-test-web/vscode-web-insider-e741ab1c964b9fbb11bffed2c0a145af22dad54f/out/vs/workbench/workbench.web.main.internal.js`.
   - Executed script and verified bundle output.
