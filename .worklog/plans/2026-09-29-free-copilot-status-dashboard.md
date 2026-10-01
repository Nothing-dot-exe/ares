# Plan: Self-Hosted & Free Copilot Status Dashboard for Universal AI

**Date**: 2026-09-29  
**Goal**: Transform the default VS Code Copilot status bar popup (`chatStatusDashboard`) into a 100% self-hosted, free, and functional control center for our local Universal AI inline ghost-text provider—completely decoupled from Microsoft subscriptions or servers.

---

## 🔍 Root Cause Analysis
1. **Disabled Status & Grayed-out Checkboxes**:
   - In `chatStatusDashboard.ts`, `canUseChat()` checks `this.chatEntitlementService.entitlement` and `sentiment`. Because no GitHub Copilot subscription exists, `canUseChat()` returns `false`.
   - When `canUseChat()` is `false`:
     - Header status evaluates to `"Disabled"`.
     - "Ghost text suggestions", "Ghost text suggestions for <lang>", and "Next edit suggestions" checkboxes are marked `.disabled` and forced to `checked = false`.
2. **Microsoft Upsell Banner**:
   - `renderSetupSection()` detects `isNewUser` / `signedOut` and renders the callout *"Set up Copilot to use AI features."* and the blue button *"[ Use AI Features ]"*.
3. **Status Bar Icon**:
   - `chatStatusEntry.ts` routes unauthenticated users through `getSetupEntryProps()`, which prompts for sign-in rather than treating the status bar entry as an active local AI control.

---

## 📐 Architecture & Changes

### 1. Configuration Defaults (`scripts/serve-web.mjs`)
- Inject initial enablement settings:
  ```javascript
  'github.copilot.enable': { '*': true },
  'github.copilot.nextEditSuggestions.enabled': true
  ```
  This ensures completions are enabled by default for all languages on first launch.

### 2. Universal AI Inline Completion Integration (`extensions/universal-ai/extension.js`)
- Update `provideInlineCompletionItems` to query:
  - `github.copilot.enable['*']`
  - `github.copilot.enable[document.languageId]`
  - `editor.inlineSuggest.enabled`
- If disabled globally or for the specific document language, skip completion generation immediately.
- This creates a direct two-way binding between the status bar dashboard checkboxes and the local Groq completion proxy (`/api/complete`).

### 3. Source Files (`src/vs/workbench/contrib/chat/browser/chatStatus/`)
- In `chatStatusDashboard.ts`:
  - `canUseChat()` returns `true`.
  - `renderSetupSection()` returns immediately (`return;`) to eliminate the Microsoft upsell prompt and button.
- In `chatStatusEntry.ts`:
  - In `getEntryProps()`, bypass the `isNewUser` and `Unknown` entitlement checks so the status bar icon always shows the active/disabled/snooze state and toggles the dashboard on click.

### 4. Runtime Web Bundle (`workbench.web.main.internal.js`)
- Patch `canUseChat()` to return `!0`.
- Patch `renderSetupSection()` to return immediately.
- Patch `getEntryProps()` to bypass the unauthenticated sign-in redirect and directly return the functional dashboard entry.

---

## 🧪 Verification Plan
1. Restart local server (`run.bat --no-open`).
2. Reload web IDE in browser (`Ctrl + F5`).
3. Click the robot icon (`🤖`) in the status bar:
   - Verify header shows `Inline Suggestions: Enabled`.
   - Verify checkboxes for "Ghost text suggestions", language-specific suggestions, and next edit suggestions are **checked and fully interactive**.
   - Verify the Microsoft "Set up Copilot" / "[Use AI Features]" upsell box is completely removed.
4. Toggle "Ghost text suggestions" off:
   - Verify the status bar icon updates to `$(copilot-unavailable)`.
   - Verify header updates to `Disabled`.
   - Verify typing in editor no longer requests completions from `/api/complete`.
5. Toggle "Ghost text suggestions" back on:
   - Verify status bar icon returns to `$(copilot)`.
   - Verify header updates to `Enabled`.
   - Verify typing in editor requests completions and displays ghost text.
