# Changes: Headless Background Terminal Execution & In-Chat Console Stream

**Date**: 2026-10-01  
**Target Files Modified**:
- [`src/vs/workbench/contrib/chat/browser/aresAi/aresAiAgent.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/aresAi/aresAiAgent.ts)

---

## 1. Problem Statement
When Ares AI executed commands via `run_command`:
1. It invoked `this._terminalService.getActiveOrCreateInstance()` and `await this._terminalService.revealTerminal(terminal, false)`.
2. This forcibly opened the bottom IDE terminal panel in the user interface and typed commands directly into the user's active visible terminal tab.
3. In chat, it only displayed a generic markdown quote block `> 🛠️ run_command Output:` instead of a clean console block.
4. The user requested: Ares AI must not pop open the IDE's terminal panel or disturb their active shell; it should execute headlessly in its own background terminal and stream/render commands and outputs directly inside the chat UI like Antigravity.

---

## 2. Root Cause Analysis
- `revealTerminal()` explicitly requests the workbench layout to reveal the panel (`PanelLocation.Bottom`).
- Grabbing `getActiveOrCreateInstance()` hijacked whatever active terminal instance the user was working with instead of a background instance.
- Furthermore, an auxiliary call to `LanguageModelToolsService.invokeTool(TerminalToolId.RunInTerminal)` was triggering additional IDE notifications.

---

## 3. Implementation Details
1. **Dedicated Headless Background Shell (`hideFromUser: true`)**:
   - Added `_aresBackgroundTerminal: ITerminalInstance | undefined` and `_getOrCreateAresBackgroundTerminal()` to `AresAiAgent`.
   - Launched the background terminal using `IShellLaunchConfig`:
     ```typescript
     {
       name: 'Ares AI Background Agent',
       hideFromUser: true,
       isFeatureTerminal: true,
       cwd: workspaceFolder?.uri
     }
     ```
   - When `hideFromUser: true` is configured, VS Code routes the instance directly to `_backgroundedTerminalInstances`, ensuring it never creates visible tabs, never steals editor focus, and never pops open the bottom panel.
2. **Never Reveal**:
   - Completely eliminated all calls to `revealTerminal()`.
   - Removed secondary invocation of `TerminalToolId.RunInTerminal`.
3. **ANSI & Echo Sanitization**:
   - Imported `removeAnsiEscapeCodes` from `base/common/strings.js`.
   - Stripped carriage returns and removed command line echo from the pty capture so output is crystal clear.
4. **Rich In-Chat Console Stream**:
   - In `aresAiAgent.ts`, `run_command` output is rendered directly into the chat response as a console markdown block:
     ```console
     $ <command>
     <output>
     ```
   - Updated other tool outputs (web search, file read/write, grep) with formatted badges and clean snippets in the chat bubble.
5. **System Prompt Alignment**:
   - Updated system prompt instructions and protocol to instruct the model that terminal commands run headlessly in the background shell and render directly in the chat UI.

---

## 4. Verification
- Transpiled all 9,482 files with `npm run transpile-client`: **0 errors**.
- All changes kept strictly local; **no git push**.
