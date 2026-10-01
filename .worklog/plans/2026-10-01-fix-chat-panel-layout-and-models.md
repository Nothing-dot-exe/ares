# Plan: Fix Chat Panel Blank/Hijacked State & Model Resolution

**Date**: 2026-10-01  
**Goal**: Resolve the issue where the chat panel displays an empty "Sessions" view or blank view instead of the interactive Ares AI chat interface, and ensure seamless model picker resolution.

## 1. Root Cause Summary
1. **Stacked Sessions Hijacking**: In `chatViewPane.ts`, when auxiliary bar width < 600px, orientation becomes `Stacked`. When the chat widget is empty, `updateSessionsControlVisibility()` sets `newSessionsContainerVisible = true`. This renders a 536px empty "Sessions" container and crushes the chat widget content to `0px` height.
2. **Welcome Screen Suppression**: `shouldShowWelcome()` in `chatViewPane.ts` checks for core agents; if it ever returns true, it triggers `ChatViewWelcomeController` which hides the chat widget while rendering an empty welcome container.
3. **`hasByokModels` Context Key**: `ChatEntitlementService.hasByokModels` dynamically reads `github.copilot.hasByokModels`, which should be unconditionally `true` in Ares IDE.
4. **Dual Vendor Registration**: `AresAiLanguageModelProvider` only registers vendor `universal-ai`, causing `ares-ai/...` model identifiers to fail resolution during toolbar build.

## 2. Implementation Steps
1. **`src/vs/workbench/contrib/chat/browser/widgetHosts/viewPane/chatViewPane.ts`**:
   - In `updateSessionsControlVisibility()`: In `Stacked` orientation, do not hijack the view with an empty sessions container.
   - In `shouldShowWelcome()`: Return `false` unconditionally so the chat widget is never hidden.
2. **`src/vs/workbench/services/chat/common/chatEntitlementService.ts`**:
   - Hardcode `get hasByokModels(): boolean { return true; }`.
3. **`src/vs/workbench/contrib/chat/browser/aresAi/aresAiLanguageModelProvider.ts`**:
   - Register provider under both `'universal-ai'` and `'ares-ai'` vendors.
   - Return model descriptors for both vendors.
4. **`scripts/prepare-desktop.mjs`**:
   - Add `settings['chat.viewSessions.enabled'] = false;` to settings.
   - Ensure clean database state.
5. **Transpile & Validation**:
   - Run `node build/next/index.ts transpile`
   - Launch Ares IDE and verify via CDP test script that the chat widget has full height, welcome view / input box are visible, and model chat requests work end-to-end.
