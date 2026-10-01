# Changes: Unlock All Hidden AI Features & Slash Commands

**Date**: 2026-10-01  
**Author**: Antigravity  

## Summary of Changes

1. **Context Key Unlocks in Core Contribution** ([`src/vs/workbench/contrib/chat/browser/aresAi/aresAi.contribution.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/aresAi/aresAi.contribution.ts)):
   - Unlocked `ChatEntitlementContextKeys.clientByokEnabled` to enable user-selectable BYOK models without vendor lock.
   - Set `ChatEntitlementContextKeys.Setup.completed`, `installed`, `registered` to `true`, and `hidden`, `disabled` to `false` to completely bypass setup and paywall wizards.
   - Granted `ChatEntitlementContextKeys.Entitlement.planEnterprise` to enable unlimited enterprise-tier agent capabilities.
   - Cleared quota blocks: `chatQuotaExceeded = false`, `completionsQuotaExceeded = false`.
   - Enabled `ChatContextKeys.languageModelsAreUserSelectable` and `nonCopilotLanguageModelsAreUserSelectable`.
   - Enabled `ChatContextKeys.agentSupportsAttachments`, `Modes.hasCustomChatModes`, and `chatEditingCanUndo`/`chatEditingCanRedo`.

2. **Core Slash Commands & Modes** ([`src/vs/workbench/contrib/chat/browser/aresAi/aresAiAgent.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/aresAi/aresAiAgent.ts)):
   - Added slash command handlers:
     - `/terminal <cmd>`: Direct terminal execution mode.
     - `/edit <instructions>`: Surgical search-and-replace code editing mode.
     - `/plan <task>`: Architecture decomposition and phase roadmap mode.
     - `/clear`: Instant context memory reset.
     - `/help`: Comprehensive reference table of all native capabilities and providers.
   - Injected `commandModifier` into `effectiveUserPrompt` so model adapts its output format to the requested slash command.

3. **Desktop & User Settings Configuration** ([`scripts/prepare-desktop.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/prepare-desktop.mjs)):
   - Configured all hidden, preview, and experimental AI flags:
     - `chat.checkpoints.enabled: true`
     - `chat.artifacts.enabled: true`
     - `chat.autopilot.advanced.enabled: true`
     - `chat.tools.global.autoApprove: true`
     - `chat.tools.terminal.enableAutoApprove: true`
     - `chat.tools.terminal.autoApprove: { ".*": true }`
     - `chat.agent.sandbox.allowUnsandboxedCommands: true`
     - `inlineChat.affordance: "editor"`
     - `chat.unifiedAgentsBar.enabled: true`
     - `chat.editing.alwaysShowEdits: true`
     - `chat.agent.maxRequests: 100`
     - `chat.detectExternalEdits: true`
     - `chat.languageModels.overrideEnabled: true`

4. **Empirical Verification** ([`scripts/test-hidden-features.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/test-hidden-features.mjs)):
   - Added automated test verifying all settings, slash command modifiers, and context key binds.
