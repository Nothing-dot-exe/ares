# 2026-09-30: Fix Chat Readiness Timeout and Default Agent Modes

## Issue
When sending a message in the Chat panel, the user received the warning:
`"Chat took too long to get ready. Please ensure you are signed in to Universal AI and that the extension vscode.universal-ai is installed and enabled. Click restart to try again if this issue persists."`

## Root Cause
1. `extensions/universal-ai/package.json` registered `chatParticipants` with `"isDefault": true`, but did not specify `"modes"`.
   In `src/vs/workbench/contrib/chat/browser/chatParticipant.contribution.ts` (line 318), omitting `modes` caused it to default to `[ChatModeKind.Ask]` only.
   When the user opened the chat in `Agent` mode or `Edit` mode, `getDefaultAgent(ChatAgentLocation.Chat, mode)` fell back to the core `SetupAgent`.
2. `SetupAgent` waited for `whenAgentReady` and `whenLanguageModelReady`.
   Because no language model had `isDefault: true`, `whenLanguageModelReady` never found a model with `isDefaultForLocation[ChatAgentLocation.Chat] = true`, resulting in a 20-second timeout.

## Fix Applied
1. [`extensions/universal-ai/package.json`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/package.json):
   - Added `"locations": ["panel", "terminal", "notebook", "editor"]`
   - Added `"modes": ["agent", "ask", "edit"]`
   This ensures `universal-ai.chat` is the default agent for all modes and locations.
2. [`extensions/universal-ai/extension.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/extension.js):
   - In `provideLanguageModelChatInformation()`, added `isDefault: (m.id === activeDefaultModel)` to mark the active model as default.
   - Synchronized all outputs to `.vscode-oss-dev/extensions/universal-ai`.
