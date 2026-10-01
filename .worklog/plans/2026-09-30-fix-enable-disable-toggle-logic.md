# Implementation Plan: Fix Inline Suggestions Enable/Disable Toggle Logic & Auto-On Defaults

**Date**: 2026-09-30  
**Goal**: Make the Inline Suggestions popup Enable/Disable button and checkboxes toggle reliably back and forth (OFF ↔ ON) matching native VS Code behavior, and eliminate all automatic/default enablement so the user has 100% manual control.

---

## 🔍 Root Cause Analysis

1. **Frozen Object Mutation in Button Handler**:
   - `renderSetupSection` called `l = this.configurationService.getValue(c)` followed by `l["*"] = a`.
   - In VS Code, configuration objects returned by `getValue()` are deep-frozen (`Object.freeze`).
   - Mutating `l["*"]` in strict mode throws `TypeError: Cannot assign to read only property '*' of object '#<Object>'`.
   - The uncaught error stopped execution before `updateValue` was called, making it impossible to toggle.

2. **Auto-Enabled Defaults**:
   - `extensions/universal-ai/package.json` had `"github.copilot.enable"` configured with `"default": { "*": true }` and `"github.copilot.nextEditSuggestions.enabled"` with `"default": true`.
   - Browser `localStorage` retained old overrides.
   - Result: Checkboxes were auto-checked and completions were forced ON on startup without user consent.

3. **Status Bar Icon Desync**:
   - `getEntryProps()` only checked `activeTextEditorLanguageId`. When focus moved to the popup or when no editor was active, it ignored global enablement state and remained `$(copilot)` (active icon) even when completions were disabled.

4. **Checkbox & Button Asymmetry**:
   - Checkbox `Ghost text suggestions` and master button `[ Enable / Disable ]` did not fully synchronize `github.copilot.enable` and `editor.inlineSuggest.enabled`.

---

## 🛠️ Step-by-Step Fix Plan

1. **Update Universal AI Extension (`extensions/universal-ai/package.json`)**:
   - Set `"github.copilot.enable"` default to `{ "*": false }`.
   - Set `"github.copilot.nextEditSuggestions.enabled"` default to `false`.

2. **Update Universal AI Provider (`extensions/universal-ai/extension.js`)**:
   - Ensure completions only run when `github.copilot.enable['*'] === true` (or language is explicitly `true`).

3. **Update Server Defaults & LocalStorage Purge (`scripts/serve-web.mjs`)**:
   - Set configuration defaults:
     - `'github.copilot.enable': { '*': false }`
     - `'editor.inlineSuggest.enabled': false`
     - `'github.copilot.nextEditSuggestions.enabled': false`
   - Inject purge logic in index HTML `<script>` to clean up stale localStorage default cache keys.

4. **Update Core TS Source Files**:
   - [`src/vs/editor/common/services/completionsEnablement.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/editor/common/services/completionsEnablement.ts): Set default to `false` when not configured.
   - [`src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusDashboard.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusDashboard.ts):
     - Fix `renderSetupSection`: Clone object before mutation (`{ ...current }`), toggle between enabled and disabled, update `editor.inlineSuggest.enabled`.
     - Fix `getCompletionsSettingAccessor`: Clone object and keep `editor.inlineSuggest.enabled` in sync.
   - [`src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusEntry.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusEntry.ts): Check both language and global enablement for `$(copilot-unavailable)`.

5. **Update Patch Script (`scripts/patch-chat-status.mjs`) & Apply to Web Bundle**:
   - Patch `renderSetupSection` with safe cloning and bidirectional toggle.
   - Patch `getEntryProps` to properly show `$(copilot-unavailable)` when disabled.
   - Patch `getCompletionsSettingAccessor` to clone and synchronize.
   - Run `node scripts/patch-chat-status.mjs`.

6. **Kill Running Server & Restart**:
   - Stop old node processes.
   - Run fresh server on port 8080.
   - Verify web endpoints.
