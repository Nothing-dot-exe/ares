# Ares IDE — Native Core AI Architecture & Implementation Plan

**Date**: 2026-10-01  
**Target**: Complete transition from `extensions/universal-ai/` to **Pure Core Native AI** in `src/vs/`  
**Execution Order**: Milestone 1 ➔ Milestone 2 ➔ Milestone 3 ➔ Milestone 4 (Each with Bug Resolution & Testing)

---

## 1. Executive Summary

Ares IDE currently runs its AI through an ad-hoc extension folder (`extensions/universal-ai/extension.js`). While this successfully bypassed Microsoft Copilot, it created technical debt:
1. Single-turn conversation blindness (no memory of previous assistant/user turns).
2. Regex-based file creation instead of utilizing VS Code core's 41 native tools (`RunInTerminalTool`, `EditTool`).
3. External extension dependency requiring launch workarounds (`prepare-desktop.mjs` SQLite patching).

This plan outlines the architecture to move all AI capabilities directly into **VS Code Core** (`src/vs/workbench/contrib/chat/browser/aresAi/`), turning Ares into a true, self-contained AI-native IDE.

---

## 2. Target Core Architecture

```
src/vs/workbench/contrib/chat/browser/aresAi/
├── aresAi.contribution.ts      # Workbench contribution & startup registration
├── aresAiService.ts           # Multi-provider client (Groq, OpenRouter, NVIDIA, Ollama) & Key Storage
├── aresAiAgent.ts             # Core Chat Participant with full Multi-Turn History
├── aresAiToolsBridge.ts       # Direct bridge to ILanguageModelToolsService (Terminal, Edits)
├── aresAiContext.ts           # Active Editor, Selection & #file context resolver
└── aresAiCompletions.ts       # Core inline ghost-text provider (ILanguageFeaturesService)
```

---

## 3. Sequential Execution Plan

### Milestone 1: Multi-Turn Conversation Memory & Core Native Provider
* **Objective**: Implement native core AI streaming service and participant with full conversation history.
* **Core Changes**:
  * Create `aresAiService.ts` to manage direct HTTPS streaming to Groq, OpenRouter, NVIDIA, Ollama using native VS Code `IRequestService` / Node `fetch`.
  * Create `aresAiAgent.ts` implementing `IChatAgentImplementation`.
  * Convert `history: IChatAgentHistoryEntry[]` into OpenAI-compatible chat messages (`[{role: 'user', content}, {role: 'assistant', content}]`).
  * Register via `IChatAgentService.registerAgent()` with `isCore: true` and `canAccessPreviousChatHistory: true`.
* **Bug Check & Resolution**:
  * Context window token overflow: Implement token budgeting to prune oldest history turns.
  * Streaming cancellation: Wire `CancellationToken` to `AbortController`.
  * Role mapping: Correctly distinguish user queries, assistant responses, and tool calls.
* **Testing Protocol**:
  * Multi-turn test via workbench debugger (`test-multi-turn.mjs`):
    - Turn 1: "Define a TypeScript interface for User with id and name."
    - Turn 2: "Now add an email field to that interface."
    - Verify Turn 2 output reflects context from Turn 1.

---

### Milestone 2: Native Tool Execution & Terminal Integration
* **Objective**: Connect the core AI agent to VS Code's native tool service (`ILanguageModelToolsService`).
* **Core Changes**:
  * Create `aresAiToolsBridge.ts`:
    - Discovers registered core tools (`vscode.runInTerminal`, `vscode.editFile`, `vscode.askQuestions`, `mcp`).
    - Translates tool definitions into OpenAI function-calling format (`tools: [...]`).
    - Detects model tool calls and executes them via `ILanguageModelToolsService.invokeTool()`.
    - Feeds tool execution results back to the model for iterative reasoning.
* **Bug Check & Resolution**:
  * Terminal command auto-approval vs prompting: Ensure safe commands run smoothly while dangerous commands respect workspace trust.
  * CWD resolution: Ensure terminal commands execute in the active workspace root.
  * Error recovery: Handle non-zero exit codes gracefully in the prompt loop.
* **Testing Protocol**:
  * Execute command test via chat:
    - User prompt: "Run 'node --version' in the terminal and tell me the version."
    - Verify terminal opens and output is analyzed by Ares AI.
  * Semantic edit test:
    - User prompt: "Refactor function X in file Y."
    - Verify native diff preview appears in the editor.

---

### Milestone 3: Rich Context Awareness (Editor, Selection & Attachments)
* **Objective**: Automatically feed active editor state, cursor selections, and `#file` references into the AI.
* **Core Changes**:
  * Create `aresAiContext.ts`:
    - Reads `IEditorService.activeTextEditorControl` (visible ranges, cursor selection).
    - Unpacks `IChatRequestVariableData` (`#file`, `#selection`, `#codebase`).
    - Injects context blocks cleanly before the user's prompt.
* **Bug Check & Resolution**:
  * Large file truncation: Cap injected file context to prevent blowing model token limits.
  * Binary file protection: Filter out images/binaries from text context.
* **Testing Protocol**:
  * Open a file, select 5 lines, ask in chat: "Explain this selection."
  * Verify AI responds specifically about the selected lines without manual copy-pasting.

---

### Milestone 4: Repository Cleanup & Security Hardening
* **Objective**: Purge obsolete upstream Copilot files and eliminate hardcoded keys.
* **Core Changes**:
  * Safely delete dead directory `extensions/copilot/`.
  * Remove `extensions/universal-ai/` once core migration is verified.
  * Update `product.json` to bind `defaultChatAgent` directly to native core agent `ares.ai`.
  * Externalize API keys into secure storage (`ISecretStorageService`) and `.keys.json` with zero embedded secrets in git.
  * Streamline `prepare-desktop.mjs` and `code.bat` (no extension patching needed).
* **Bug Check & Resolution**:
  * Verify zero compile errors (`npm run compile`).
  * Verify zero launch warnings in `desktop_run.log`.
* **Testing Protocol**:
  * Full desktop launch from `run.bat`.
  * Validate end-to-end chat, autocomplete, and tools inside the running Ares IDE window.

---

## 4. Total Scope of Changes

| Category | File Count | Locations |
| :--- | :--- | :--- |
| **New Core Files** | 5 files | `src/vs/workbench/contrib/chat/browser/aresAi/` |
| **Modified Core Files** | 3 files | `chat.all.contribution.ts`, `product.json`, `product.ts` |
| **Removed / Deprecated** | 2 folders | `extensions/copilot/`, `extensions/universal-ai/` |
| **Updated Scripts** | 2 files | `scripts/code.bat`, `scripts/prepare-desktop.mjs` |
