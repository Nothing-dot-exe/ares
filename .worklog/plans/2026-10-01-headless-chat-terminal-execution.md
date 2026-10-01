# Plan: Headless Dedicated Background Terminal Execution for Ares AI

## 1. User Request & Feedback
> "ok but it open terminal of ide why it not using its own lik how you work inside chat only or evrything"

### The Issue
Previously, when Ares AI invoked `run_command`:
1. It called `this._terminalService.getActiveOrCreateInstance()`.
2. It called `this._terminalService.revealTerminal(terminal, false)`.
3. This forcibly popped open the user's IDE bottom panel and typed directly into the user's active interactive terminal window, interrupting what the user was working on.
4. The user expects Ares AI to work like Antigravity: running commands silently in its own dedicated background terminal, streaming the execution and output directly inside the chat UI, without disturbing or popping open the IDE's bottom panel.

## 2. Technical Solution
1. **Dedicated Hidden Background Terminal (`hideFromUser: true`)**:
   - Create and maintain a persistent background terminal instance:
     ```typescript
     const config: IShellLaunchConfig = {
         name: 'Ares AI Background Agent',
         icon: ThemeIcon.fromId('sparkle'),
         hideFromUser: true,
         cwd: workspaceFolder?.uri
     };
     ```
   - `hideFromUser: true` tells VS Code's terminal service that this is an internal agent terminal:
     - It does NOT appear in the user's terminal tabs.
     - It does NOT open or reveal the bottom dock.
     - It does NOT steal focus.
2. **Execute Inside Chat UI**:
   - `run_command` executes in the background terminal.
   - Live stdout/stderr is captured via `onData` and rendered directly inside the chat as a native console code block:
     ```console
     $ <command>
     <output>
     ```
   - The user sees everything inside the chat bubble, while the IDE layout remains clean and untouched.
3. **Preserve User Terminal for Explicit Slash Command**:
   - If and only if the user explicitly types `/terminal <command>` does it reveal the user's visible IDE terminal. Normal chat agent interactions use the headless background terminal.

## 3. Implementation Steps
1. Update [`src/vs/workbench/contrib/chat/browser/aresAi/aresAiAgent.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/aresAi/aresAiAgent.ts):
   - Add `_aresBackgroundTerminal` field and `_getOrCreateAresBackgroundTerminal()` method.
   - Refactor `_executeTerminalCommand` to run in the background terminal without `revealTerminal`.
   - Update chat progress rendering for `run_command` to render console code blocks in the chat.
2. Transpile client with `npm run transpile-client`.
3. Validate locally with test scripts.
4. Update `.worklog/` documentation (Do NOT push to GitHub).
