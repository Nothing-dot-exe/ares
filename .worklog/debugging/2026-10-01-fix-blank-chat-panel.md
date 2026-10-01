# Debugging: Fix Blank Chat Panel (Session 2)

**Date**: 2026-10-01  
**Issue**: Chat panel on the right shows "Chat" title but is completely blank — no input box, no messages, no chat UI

## Root Cause Analysis

### The Rendering Gate
In `chatViewPane.ts` line 1096:
```ts
this._widget.setVisible(this.isBodyVisible() && !this.welcomeController?.isShowingWelcome.read(reader));
```

The **chat widget is hidden whenever `welcomeController.isShowingWelcome = true`**.

### Why Welcome Shows as Blank
The `ChatViewWelcomeController.update()` calls `shouldShowWelcome()` first:
```ts
override shouldShowWelcome(): boolean {
    const hasCoreAgent = this.chatAgentService.getAgents().some(agent => agent.isCore && agent.locations.includes(ChatAgentLocation.Chat));
    const shouldShow = !hasCoreAgent && (!hasDefaultAgent || ...);
    return !!shouldShow;
}
```

IF `hasCoreAgent = false` → shows welcome → **hides chat widget**.  
IF `hasCoreAgent = true` BUT welcome is showing → also hides chat widget.

### Why It Was Blank (Not Even a Welcome View)
When `shouldShowWelcome() = true` but `chatViewsWelcomeRegistry` has NO matching descriptors → the welcome element renders but is empty → **blank panel**.

### The Missing Context Keys
The `chat.setupContext` in SQLite had:
- `entitlement: 1` (should be 6 = Enterprise)
- `installed: false` (should be `true`)

AND `hasByokModels` context key was never set to `true` in our contribution.

In `chatViewPane.ts` line 981:
```ts
(!!this.chatEntitlementService.sentiment.completed || this.chatEntitlementService.hasByokModels)
```

`hasByokModels` was `false` because:
1. DB had `chat.hasByokModels.lastKnown = false`
2. Contribution never set `ChatEntitlementContextKeys.hasByokModels.set(true)`

## Fixes Applied

### 1. SQLite DB Fix (immediate, applied via `fix-chat-state.mjs`)
- `chat.setupContext.entitlement` → 6 (Enterprise)
- `chat.setupContext.installed` → true
- `chat.hasByokModels.lastKnown` → true
- `chat.currentLanguageModel.panel` → `ares-ai/openai/gpt-oss-120b`
- Deleted `workbench.panel.chat.hidden`

### 2. `aresAi.contribution.ts` Fix
Added missing context keys:
```ts
ChatEntitlementContextKeys.Entitlement.signedOut.bindTo(this._contextKeyService).set(false);
ChatEntitlementContextKeys.Entitlement.planFree.bindTo(this._contextKeyService).set(false);
ChatEntitlementContextKeys.hasByokModels.bindTo(this._contextKeyService).set(true);
```

### 3. `prepare-desktop.mjs` Fix
Updated SQLite sanitization to:
- Always write `entitlement: 6, installed: true` (not just update if exists)
- Always set `hasByokModels.lastKnown = true`
- Delete `workbench.panel.chat.hidden` 
- Set `chat.currentLanguageModel.panel` to `ares-ai/openai/gpt-oss-120b`

## Status
- [x] DB fixed immediately (already applied)
- [x] `aresAi.contribution.ts` updated
- [x] `prepare-desktop.mjs` updated  
- [ ] Build transpile running
- [ ] Needs verification in Ares IDE after rebuild
