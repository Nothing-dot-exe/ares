# Change Log: Decoupled & Free Copilot Status Dashboard for Universal AI

**Date**: 2026-09-29  
**Type**: Enhancement / Decoupling / Feature Enablement  
**Author**: AI Assistant

---

## 📌 Summary
Decoupled the status bar Copilot menu popup (`ChatStatusDashboard`) completely from Microsoft servers, subscription checks, and paywall upsells. Made the inline suggestions status and all three suggestion checkboxes (`Ghost text suggestions`, `Ghost text suggestions for <lang>`, and `Next edit suggestions`) fully active, free, and directly wired to our local Universal AI inline completion provider (`qwen/qwen3.8-27b` via `/api/complete`).

---

## 📂 Modified Files

### 1. [`scripts/serve-web.mjs`](../../scripts/serve-web.mjs)
- Added default configuration values into `workbenchConfig.configurationDefaults`:
  - `'github.copilot.enable': { '*': true }`: Enables inline suggestions globally by default.
  - `'github.copilot.nextEditSuggestions.enabled': true`: Enables next edit suggestions by default.

### 2. [`extensions/universal-ai/extension.js`](../../extensions/universal-ai/extension.js)
- In `provideInlineCompletionItems`:
  - Injected checks for `github.copilot.enable['*']` and `github.copilot.enable[document.languageId]`.
  - When the user turns off "Ghost text suggestions" in the popup menu, completions are immediately suppressed.
  - When toggled back on, completions immediately resume.

### 3. [`src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusDashboard.ts`](../../src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusDashboard.ts)
- `canUseChat()`: Now always returns `true`, enabling the suggestions section, setting status text to `"Enabled"`, and keeping all checkboxes active and interactive.
- `renderSetupSection()`: Returns immediately (`return;`), suppressing the Microsoft Copilot upsell box (*"Set up Copilot to use AI features."*) and the blue *"[ Use AI Features ]"* button.

### 4. [`src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusEntry.ts`](../../src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusEntry.ts)
- `getEntryProps()`: Bypassed the `isNewUser` and `Unknown` entitlement checks so the status bar icon (`🤖`) directly acts as an active local AI control, displaying status (`$(copilot)` when enabled, `$(copilot-unavailable)` when disabled) and opening the dashboard on click.

### 5. Runtime Web Bundle [`workbench.web.main.internal.js`](../../.vscode-test-web/vscode-web-insider-e741ab1c964b9fbb11bffed2c0a145af22dad54f/out/vs/workbench/workbench.web.main.internal.js)
- Patched minified runtime:
  - `canUseChat(){return!0}`
  - `renderSetupSection(){return}`
  - Updated `getEntryProps()` to preserve full interactive status bar toggle without Microsoft sign-in redirects.

### 6. [`scripts/patch-chat-status.mjs`](../../scripts/patch-chat-status.mjs)
- Standalone Node.js script automating the verification and patching of `workbench.web.main.internal.js`.

---

## 🔬 Verification
1. `/api/complete` endpoint verified responding with completions via Groq `qwen/qwen3.8-27b`.
2. Verified all bundle patch conditions in `workbench.web.main.internal.js` return `true`.
3. Web server rebooted on `http://localhost:8080/?ew=true`.
