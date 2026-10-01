# Plan: Autonomous Agent ReAct Loop & Full Tool Suite for Ares AI

## 1. User Request & Problem Statement
The user asked:
> "why in ares it cant use terminal and more feture like you i want all this fetures like you from this time dont push to github anything first solve this problem then we look what to do"

### Current Limitations in Ares AI:
1. **Single-Turn Execution**: `aresAiAgent.ts` only called `streamChatCompletion` once. It never ran an autonomous multi-turn loop (ReAct: Reason + Act).
2. **No Terminal Output Feedback**: Terminal commands were dispatched blindly via `sendText` without capturing the stdout/stderr and feeding it back into the model. The model could never see what happened or use the terminal output to make follow-up decisions.
3. **Missing Tool Set**: Ares AI lacked file inspection (`read_file`), directory listing (`list_dir`), code searching (`grep_search`), and live interactive terminal execution with output streaming.

## 2. Architecture: Full Autonomous Agent Capabilities (Antigravity-grade)

### A. ReAct Multi-Turn Autonomous Loop
Instead of a single stream-and-exit, `AresAiAgent.invoke` will execute a multi-step agent loop (up to `MAX_STEPS = 10`):
1. **Turn N**: Model streams thought process and tool calls.
2. **Tool Execution**: Agent identifies all tool calls in the output, executes them natively with progress feedback in chat.
3. **Output Feedback**: Agent captures real execution output (stdout/stderr/file contents) and feeds it back into `messages` as `[Tool Result for <toolName>]`.
4. **Follow-up Reasoning**: Model receives the tool output, evaluates the result, and either calls the next tool or provides the final answer.
5. **Termination**: When the model produces final text without tool calls, or reaches `MAX_STEPS`.

### B. Core Native Tool Suite
1. **`run_command`**:
   - Executes shell commands live in the integrated terminal (`ITerminalService`).
   - Streams output and waits for idle/completion, captures stdout/stderr, and returns clean text (ANSI-stripped).
2. **`read_file`**:
   - Reads workspace files via `IFileService` with line range support (`startLine`, `endLine`).
3. **`write_file`**:
   - Creates or completely overwrites workspace files via `IFileService` and opens them in editor tabs via `IEditorService`.
4. **`edit_file`**:
   - Surgically applies search-and-replace patches to existing files.
5. **`list_dir`**:
   - Lists files and subdirectories with file sizes and type indicators via `IFileService.resolve`.
6. **`grep_search`**:
   - Searches workspace files for regex patterns or text queries.

### C. Universal Tool Call Parsing
Supports all standard agent tool calling conventions:
- XML format: `<tool_call>\n{"name": "...", "arguments": {...}}\n</tool_call>`
- Tag format: `<tool_call>\n<name>...</name>\n<arguments>...</arguments>\n</tool_call>`
- Tool block: ````tool:<name>\n{...}\n````
- Bracket format: `[run_command(command="...")]`, `[read_file(path="...")]`, etc.
- Script execution block: ````bash:run\n...\n````
- Search/Replace blocks: `<<<<<<< SEARCH\n...\n=======\n...\n>>>>>>>`
- File generation blocks: ````lang:path/to/file\n...\n````

## 3. Step-by-Step Implementation
1. Enhance [`aresAiAgent.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/aresAi/aresAiAgent.ts) with:
   - Rich System Prompt detailing the tools and autonomous reasoning guidelines.
   - `_executeTerminalCommand` with live capture and idle detection via `ITerminalInstance.onData`.
   - `_readFile`, `_writeFile`, `_editFile`, `_listDir`, `_grepSearch` tool handlers.
   - Multi-step ReAct loop with step limit and cancellation token support.
   - Streaming progress updates for tool invocations and results in the chat UI.
2. Transpile client with `npm run transpile-client`.
3. Create automated test scripts in `scripts/` to verify terminal execution with output capture and multi-turn tool calling.
4. Record documentation in `.worklog/` (Do NOT push to GitHub per user instruction).
