/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { removeAnsiEscapeCodes } from '../../../../../base/common/strings.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { URI } from '../../../../../base/common/uri.js';
import { basename, joinPath } from '../../../../../base/common/resources.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatProgress } from '../../common/chatService/chatService.js';
import { IChatAgentHistoryEntry, IChatAgentImplementation, IChatAgentRequest, IChatAgentResult } from '../../common/participants/chatAgents.js';
import { ILanguageModelToolsService } from '../../common/tools/languageModelToolsService.js';
import { ITerminalInstance, ITerminalService } from '../../../terminal/browser/terminal.js';
import { IChatRequestVariableEntry } from '../../common/attachments/chatVariableEntries.js';
import { IAresAiKeyManager } from './aresAiKeyManager.js';
import { findProviderForModel, streamChatCompletion } from './aresAiClient.js';
import { ARES_AI_PROVIDERS, IAresAiMessage } from './aresAiTypes.js';

interface IExtractedToolCall {
	name: string;
	args: Record<string, any>;
	raw: string;
}

export class AresAiAgent implements IChatAgentImplementation {

	private _aresBackgroundTerminal: ITerminalInstance | undefined;
	private _aresBackgroundTerminalReady: Promise<void> | undefined;

	constructor(
		@IAresAiKeyManager private readonly _keyManager: IAresAiKeyManager,
		@IFileService private readonly _fileService: IFileService,
		@IEditorService private readonly _editorService: IEditorService,
		@ICodeEditorService private readonly _codeEditorService: ICodeEditorService,
		@ITerminalService private readonly _terminalService: ITerminalService,
		@ILanguageModelToolsService private readonly _toolsService: ILanguageModelToolsService,
		@IWorkspaceContextService private readonly _workspaceContextService: IWorkspaceContextService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@ILogService private readonly _logService: ILogService,
	) {}

	async invoke(
		request: IChatAgentRequest,
		progress: (parts: IChatProgress[]) => void,
		history: IChatAgentHistoryEntry[],
		token: CancellationToken
	): Promise<IChatAgentResult> {
		const rawModelId = request.userSelectedModelId || this._configurationService.getValue<string>('aresAi.model') || this._configurationService.getValue<string>('universalAi.model');
		const { providerName, modelId } = findProviderForModel(rawModelId);
		const provider = ARES_AI_PROVIDERS[providerName] || ARES_AI_PROVIDERS['Groq'];
		const customBaseUrl = this._configurationService.getValue<string>('aresAi.customBaseUrl');
		const apiKey = await this._keyManager.getApiKey(providerName);

		if (provider.requiresKey && !apiKey) {
			progress([{
				kind: 'markdownContent',
				content: new MarkdownString(
					`### 🔐 API Key Required\n\n` +
					`To chat with **${providerName}**, please configure your API key or switch to an offline/free provider:\n\n` +
					`- [🔑 **Configure ${providerName} Key**](command:universal-ai.setApiKey)\n` +
					`- [☁️ **Switch to Ollama Tunnel (Qwen 3.8 · Free)**](command:universal-ai.selectProvider)\n` +
					`- [💻 **Switch to Local Ollama (Offline)**](command:universal-ai.selectProvider)\n\n` +
					`*(Zero browser needed — all authentication runs natively inside Ares IDE).*`
				)
			}]);
			return {};
		}

		progress([{
			kind: 'progressMessage',
			content: new MarkdownString(`Thinking with ${providerName} (${modelId})...`),
			shimmer: true
		}]);

		// Handle Slash Commands
		if (request.command === 'clear') {
			progress([{
				kind: 'markdownContent',
				content: new MarkdownString('🧹 **Conversation history cleared.** Ready for a new task!')
			}]);
			return {};
		}

		if (request.command === 'help') {
			progress([{
				kind: 'markdownContent',
				content: new MarkdownString(
					`### 🏛️ Ares AI — Native Core Autonomous Capabilities\n\n` +
					`| Capability | Trigger / Usage | Description |\n` +
					`| :--- | :--- | :--- |\n` +
					`| **Autonomous ReAct Loop** | Default | Multi-step reasoning, active tool use, and validation. |\n` +
					`| **Live Terminal Execution** | \`run_command\` / \`/terminal\` | Executes shell commands live in terminal & reads output. |\n` +
					`| **Live Web Search** | \`web_search <query>\` | Searches the live internet for docs, packages, and answers. |\n` +
					`| **Web Page Fetcher** | \`fetch_web_page <url>\` | Reads live documentation, tutorials, and web pages directly. |\n` +
					`| **File Inspection** | \`read_file\` | Reads file lines with precise line-range slicing. |\n` +
					`| **Code Creation** | \`write_file\` | Writes full files and opens them in the editor. |\n` +
					`| **Surgical Patching** | \`edit_file\` / \`/edit\` | Search-and-replace patching on existing code. |\n` +
					`| **Workspace Exploration** | \`list_dir\`, \`grep_search\` | Lists directories and searches regex patterns. |\n` +
					`| **Architecture Planner** | \`/plan <goal>\` | High-level decomposition and implementation roadmap. |\n` +
					`| **Clear Session** | \`/clear\` | Reset multi-turn conversation memory. |\n\n` +
					`#### ⚡ Available Providers & Models\n` +
					`- **Groq**: \`openai/gpt-oss-120b\`, \`qwen/qwen3.8-27b\`, \`openai/gpt-oss-20b\`, \`llama-3.3-70b-versatile\`\n` +
					`- **OpenRouter**: \`liquid/lfm-2.5-2.6b:free\`, \`nvidia/nemotron-3.5-lightning:free\`\n` +
					`- **NVIDIA NIM**: \`meta/llama-3.2-11b-vision-instruct\`\n` +
					`- **Ollama Tunnel**: \`qwen3.8-27b-uncensored-mtp\`, \`hf.co/JonathanColetti/Qwen3.8-27B-Uncensored-GGUF:Q4_K_M\`\n` +
					`- **Local Ollama**: \`qwen2.5-coder:latest\`, \`llama3.2:latest\`, \`deepseek-r1:latest\`\n\n` +
					`*Use [**Configure API Keys**](command:ares.ai.setApiKey) or [**Switch Provider**](command:ares.ai.selectProvider) at any time.*`
				)
			}]);
			return {};
		}

		let commandModifier = '';
		if (request.command === 'plan') {
			commandModifier = '\n[MODE: ARCHITECTURAL PLANNER - Provide a clear, phase-by-phase implementation plan and task decomposition before writing code.]\n';
		} else if (request.command === 'edit') {
			commandModifier = '\n[MODE: SURGICAL FILE EDITOR - Focus exclusively on inspecting and applying search/replace edits to existing files.]\n';
		} else if (request.command === 'terminal') {
			commandModifier = '\n[MODE: TERMINAL EXECUTION - Execute terminal commands using run_command to complete the user goal.]\n';
		}

		// 1. Gather Active Editor Context & Selection
		let editorContext = '';
		try {
			const activeCodeEditor = this._codeEditorService.getActiveCodeEditor();
			if (activeCodeEditor) {
				const model = activeCodeEditor.getModel();
				if (model) {
					const fileName = basename(model.uri);
					const lang = model.getLanguageId();
					const selection = activeCodeEditor.getSelection();
					if (selection && !selection.isEmpty()) {
						const selectedText = model.getValueInRange(selection);
						if (selectedText.trim().length > 0) {
							editorContext += `\n\n[Active File: ${fileName} (${lang})]\n[Selected Code (lines ${selection.startLineNumber}-${selection.endLineNumber})]:\n\`\`\`${lang}\n${selectedText}\n\`\`\`\n`;
						}
					} else {
						editorContext += `\n\n[Active File in Editor: ${fileName} (${lang})]`;
					}
				}
			}
		} catch (e) {
			this._logService.debug('[AresAiAgent] Error resolving active editor context:', e);
		}

		// 2. Gather Attached Files and Variables (#file attachments)
		let attachmentContext = '';
		if (request.variables && Array.isArray(request.variables.variables)) {
			for (const v of request.variables.variables) {
				try {
					const vUri = IChatRequestVariableEntry.toUri(v);
					if (vUri) {
						const stat = await this._fileService.stat(vUri);
						if (!stat.isDirectory && stat.size < 60000) {
							const fileBuffer = await this._fileService.readFile(vUri);
							attachmentContext += `\n\n[Attached File: ${basename(vUri)}]:\n\`\`\`\n${fileBuffer.value.toString()}\n\`\`\`\n`;
						}
					} else if (typeof v.value === 'string' && v.value.trim().length > 0) {
						attachmentContext += `\n\n[Attached Variable: ${v.name}]:\n${v.value}\n`;
					}
				} catch (e) {
					this._logService.debug('[AresAiAgent] Could not resolve attached variable:', v, e);
				}
			}
		}

		const systemPrompt = `You are Ares AI, the autonomous pair-programming AI agent built directly into Ares IDE core.
You have direct, hands-on capabilities inside the editor, workspace, and terminal:

### 🛠️ AVAILABLE TOOLS
You can invoke tools at any point by outputting a structured tool call.
Supported format:
<tool_call>
{"name": "tool_name", "arguments": {"param1": "value1"}}
</tool_call>

Tools available:
1. \`run_command\`:
   Execute any command headlessly in the background terminal and receive the real stdout/stderr output directly inside chat.
   Arguments: {"command": "dir"} or {"command": "npm test"} or {"command": "git status"}
2. \`read_file\`:
   Read a workspace file's content with optional line slicing.
   Arguments: {"path": "src/index.ts", "startLine": 1, "endLine": 100}
3. \`write_file\`:
   Create or overwrite a file in the workspace and open it in an editor tab.
   Arguments: {"path": "src/calculator.ts", "content": "..."}
4. \`edit_file\`:
   Surgically replace a unique block of text in an existing file.
   Arguments: {"path": "src/index.ts", "search": "old code block", "replace": "new code block"}
5. \`list_dir\`:
   List all files and subdirectories in a directory with file sizes.
   Arguments: {"path": "."} or {"path": "src"}
6. \`grep_search\`:
   Search for a string or regex pattern across workspace files.
   Arguments: {"query": "export function", "path": "."}
7. \`web_search\`:
   Search the live internet for documentation, current library APIs, packages, error troubleshooting, or real-time info.
   Arguments: {"query": "how to use electron ipcRenderer in typescript"}
8. \`fetch_web_page\`:
   Fetch and read the live text content of any public URL or documentation page.
   Arguments: {"url": "https://nodejs.org/api/fs.html"}

### 🤖 AUTONOMOUS AGENT PROTOCOL
- ACTION FIRST: If the user asks to run a command, test code, list files, debug an error, or search the web, DO NOT just give instructions—CALL THE TOOL and execute it yourself!
- LIVE INTERNET ACCESS: You have full access to search the internet and fetch web pages. Use web_search whenever you need up-to-date documentation, external libraries, or solutions to errors!
- MULTI-STEP REASONING: After each tool execution, you will receive the exact tool output. Use it to verify the results, fix errors, or proceed to the next step.
- COMPLETE CODE: When writing code, provide 100% complete, working files. Never leave TODOs, placeholders, or omitted blocks.
- HEADLESS BACKGROUND SHELL: When you run a command via \`run_command\`, it executes headlessly in the background and the console output is rendered directly inside chat. The IDE terminal panel will not pop open. You can execute builds, tests, git commands, and shell scripts effortlessly.`;

		// 3. Build Multi-Turn Conversation History
		const messages: IAresAiMessage[] = [
			{ role: 'system', content: systemPrompt }
		];

		if (Array.isArray(history) && history.length > 0) {
			for (const entry of history) {
				const userText = entry.request?.message;
				if (userText) {
					messages.push({ role: 'user', content: userText });
				}

				if (Array.isArray(entry.response)) {
					let assistantText = '';
					for (const part of entry.response) {
						if ('content' in part && part.content) {
							if (typeof part.content === 'string') {
								assistantText += part.content;
							} else if ('value' in part.content && typeof part.content.value === 'string') {
								assistantText += part.content.value;
							}
						}
					}
					if (assistantText.trim().length > 0) {
						messages.push({ role: 'assistant', content: assistantText.trim() });
					}
				}
			}
		}

		// Prune oldest turns if conversation grows too long
		if (messages.length > 20) {
			const systemMsg = messages[0];
			const recentTurns = messages.slice(-18);
			messages.length = 0;
			messages.push(systemMsg, ...recentTurns);
		}

		// Append the active user prompt with context
		const effectiveUserPrompt = request.message + commandModifier + editorContext + attachmentContext;
		messages.push({ role: 'user', content: effectiveUserPrompt });

		this._logService.trace(`[AresAiAgent] Starting autonomous loop with ${providerName} (${modelId}).`);

		// ==========================================================
		// 4. AUTONOMOUS ReAct (REASON + ACT) MULTI-STEP AGENT LOOP
		// ==========================================================
		const MAX_STEPS = 10;
		let currentStep = 0;

		try {
			while (currentStep < MAX_STEPS && !token.isCancellationRequested) {
				currentStep++;

				let turnContent = '';
				let isThinking = false;

				await streamChatCompletion(
					providerName,
					apiKey,
					modelId,
					messages,
					({ content, reasoning }) => {
						if (reasoning) {
							if (!isThinking) {
								progress([{ kind: 'markdownContent', content: new MarkdownString(`\n> *Thinking...*\n> `) }]);
								isThinking = true;
							}
							progress([{ kind: 'markdownContent', content: new MarkdownString(reasoning.replace(/\n/g, '\n> ')) }]);
						}
						if (content) {
							turnContent += content;
							if (isThinking) {
								progress([{ kind: 'markdownContent', content: new MarkdownString(`\n\n---\n\n`) }]);
								isThinking = false;
							}
							// Only stream text if it's not inside a raw <tool_call> block
							if (!content.includes('<tool_call>') && !content.includes('```tool:')) {
								progress([{ kind: 'markdownContent', content: new MarkdownString(content) }]);
							}
						}
					},
					token,
					customBaseUrl
				);

				if (token.isCancellationRequested) {
					break;
				}

				// Extract any tool calls from this turn
				const toolCalls = this._extractToolCalls(turnContent);

				// If no tool calls were requested, handle any passive code/edit blocks and finish
				if (toolCalls.length === 0) {
					await this._handlePassiveCodeBlocks(turnContent, progress, token);
					break;
				}

				// Record the assistant's message in the conversation history
				messages.push({ role: 'assistant', content: turnContent });

				// Execute each tool call and collect results
				for (const tool of toolCalls) {
					if (token.isCancellationRequested) break;

					const toolLabel = (tool.name === 'run_command' || tool.name === 'run_in_terminal' || tool.name === 'execute_command')
						? `running \`${tool.args.command || tool.args.cmd || ''}\` in background terminal`
						: (tool.name === 'web_search' || tool.name === 'search_web')
						? `searching the web for "${tool.args.query || ''}"`
						: (tool.name === 'fetch_web_page' || tool.name === 'read_url' || tool.name === 'fetch_page')
						? `fetching web page "${tool.args.url || ''}"`
						: `${tool.name} (${tool.args.path || tool.args.query || tool.args.url || ''})`;

					progress([{
						kind: 'progressMessage',
						content: new MarkdownString(`⚡ Ares AI ${toolLabel}...`),
						shimmer: true
					}]);

					let toolResult = '';
					try {
						switch (tool.name) {
							case 'run_command':
							case 'run_in_terminal':
							case 'execute_command':
								toolResult = await this._executeTerminalCommand(tool.args.command || tool.args.cmd || '', request, token);
								break;
							case 'web_search':
							case 'search_web':
								toolResult = await this._webSearch(tool.args.query || tool.args.q || '', token);
								break;
							case 'fetch_web_page':
							case 'read_url':
							case 'fetch_page':
								toolResult = await this._fetchWebPage(tool.args.url || tool.args.link || '', token);
								break;
							case 'read_file':
								toolResult = await this._readFile(tool.args.path || tool.args.filePath || '', tool.args.startLine, tool.args.endLine);
								break;
							case 'write_file':
							case 'create_file':
								toolResult = await this._writeFile(tool.args.path || tool.args.filePath || '', tool.args.content || '');
								break;
							case 'edit_file':
							case 'patch_file':
								toolResult = await this._editFile(tool.args.path || tool.args.filePath || '', tool.args.search || '', tool.args.replace || '');
								break;
							case 'list_dir':
							case 'list_directory':
								toolResult = await this._listDir(tool.args.path || tool.args.dirPath);
								break;
							case 'grep_search':
							case 'search_code':
								toolResult = await this._grepSearch(tool.args.query || '', tool.args.path || tool.args.searchPath);
								break;
							default:
								toolResult = `Error: Unknown tool "${tool.name}". Available tools: run_command, web_search, fetch_web_page, read_file, write_file, edit_file, list_dir, grep_search.`;
						}
					} catch (err: any) {
						toolResult = `Error executing ${tool.name}: ${err.message}`;
					}

					// Display tool output snippet directly in chat (console block for commands)
					if (tool.name === 'run_command' || tool.name === 'run_in_terminal' || tool.name === 'execute_command') {
						const cmd = (tool.args.command || tool.args.cmd || '').trim();
						const displayOutput = toolResult.length > 2000 ? toolResult.slice(0, 2000) + '\n... (output truncated for chat view)' : toolResult;
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n\`\`\`console\n$ ${cmd}\n${displayOutput}\n\`\`\`\n\n`)
						}]);
					} else if (tool.name === 'web_search' || tool.name === 'search_web') {
						const q = tool.args.query || tool.args.q || '';
						const display = toolResult.length > 700 ? toolResult.slice(0, 700) + '\n... (truncated)' : toolResult;
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n> 🌐 **Web Search:** \`${q}\`\n\`\`\`markdown\n${display}\n\`\`\`\n\n`)
						}]);
					} else if (tool.name === 'fetch_web_page' || tool.name === 'read_url' || tool.name === 'fetch_page') {
						const url = tool.args.url || tool.args.link || '';
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n> 📄 **Fetched URL:** [${url}](${url}) (${toolResult.length} characters)\n\n`)
						}]);
					} else if (tool.name === 'read_file') {
						const filePath = tool.args.path || tool.args.filePath || '';
						const lineCount = toolResult.split('\n').length;
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n> 📖 **Read File:** \`${filePath}\` (${lineCount} lines)\n\n`)
						}]);
					} else if (tool.name === 'write_file' || tool.name === 'create_file') {
						const filePath = tool.args.path || tool.args.filePath || '';
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n> ✏️ **Wrote File:** \`${filePath}\`\n\n`)
						}]);
					} else if (tool.name === 'edit_file' || tool.name === 'patch_file') {
						const filePath = tool.args.path || tool.args.filePath || '';
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n> 📝 **Edited File:** \`${filePath}\`\n\n`)
						}]);
					} else if (tool.name === 'list_dir' || tool.name === 'list_directory') {
						const dirPath = tool.args.path || tool.args.dirPath || '.';
						const display = toolResult.length > 500 ? toolResult.slice(0, 500) + '\n... (truncated)' : toolResult;
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n> 📁 **Directory Listing:** \`${dirPath}\`\n\`\`\`\n${display}\n\`\`\`\n\n`)
						}]);
					} else if (tool.name === 'grep_search' || tool.name === 'search_code') {
						const q = tool.args.query || '';
						const display = toolResult.length > 600 ? toolResult.slice(0, 600) + '\n... (truncated)' : toolResult;
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n> 🔍 **Code Search:** \`${q}\`\n\`\`\`\n${display}\n\`\`\`\n\n`)
						}]);
					} else {
						const preview = toolResult.length > 400 ? toolResult.slice(0, 400) + '\n... (truncated)' : toolResult;
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n> 🛠️ **${tool.name} Output:**\n\`\`\`\n${preview}\n\`\`\`\n\n`)
						}]);
					}

					// Feed the tool result back into the prompt for the next turn
					messages.push({
						role: 'user',
						content: `[Tool Result for ${tool.name}]:\n${toolResult}`
					});
				}
			}

		} catch (err: any) {
			if (token.isCancellationRequested) {
				return {};
			}
			progress([{
				kind: 'markdownContent',
				content: new MarkdownString(`\n\n❌ **Error connecting to ${providerName}:** ${err.message}\n\n`)
			}]);
		}

		return {};
	}

	// ==========================================================
	// 5. TOOL IMPLEMENTATIONS
	// ==========================================================

	/**
	 * Gets or spawns a dedicated, headless background terminal for Ares AI.
	 * Configured with hideFromUser: true so the IDE's bottom terminal panel never opens.
	 */
	private async _getOrCreateAresBackgroundTerminal(): Promise<ITerminalInstance | undefined> {
		if (this._aresBackgroundTerminal && !this._aresBackgroundTerminal.isDisposed) {
			return this._aresBackgroundTerminal;
		}

		try {
			const workspaceFolder = this._workspaceContextService.getWorkspace().folders[0];
			const terminal = await this._terminalService.createTerminal({
				config: {
					name: 'Ares AI Background Agent',
					hideFromUser: true,
					isFeatureTerminal: true,
					cwd: workspaceFolder?.uri
				},
				cwd: workspaceFolder?.uri
			});

			if (!terminal) {
				return undefined;
			}

			this._aresBackgroundTerminal = terminal;
			terminal.onDisposed(() => {
				if (this._aresBackgroundTerminal === terminal) {
					this._aresBackgroundTerminal = undefined;
					this._aresBackgroundTerminalReady = undefined;
				}
			});

			// Await process readiness and allow initial shell prompt/banner to flush
			this._aresBackgroundTerminalReady = terminal.processReady.then(() => {
				return new Promise<void>(resolve => setTimeout(resolve, 400));
			});

			await this._aresBackgroundTerminalReady;
			return terminal;
		} catch (e) {
			this._logService.error('[Ares AI] Failed to initialize background terminal:', e);
			return undefined;
		}
	}

	/**
	 * Executes a shell command headlessly inside Ares AI's dedicated background terminal,
	 * waits for output to settle (idle silence), and captures clean stdout/stderr.
	 * The IDE's visible terminal panel is never opened or disturbed.
	 */
	private async _executeTerminalCommand(command: string, request: IChatAgentRequest, token: CancellationToken): Promise<string> {
		if (!command || !command.trim()) {
			return 'Error: No command provided to run_command.';
		}

		const terminal = await this._getOrCreateAresBackgroundTerminal();
		if (!terminal) {
			return 'Error: Could not initialize Ares AI background terminal.';
		}

		return new Promise<string>((resolve) => {
			let output = '';
			let idleTimer: any = null;
			let maxTimer: any = null;
			let isResolved = false;

			const cleanUp = () => {
				if (idleTimer) clearTimeout(idleTimer);
				if (maxTimer) clearTimeout(maxTimer);
				dataListener.dispose();
			};

			const finish = () => {
				if (isResolved) return;
				isResolved = true;
				cleanUp();

				// Strip ANSI codes and carriage returns
				let clean = removeAnsiEscapeCodes(output)
					.replace(/\r\n/g, '\n')
					.replace(/\r/g, '\n')
					.trim();

				// Remove echoed command line if present at beginning of output
				const trimmedCmd = command.trim();
				if (clean.startsWith(trimmedCmd)) {
					clean = clean.slice(trimmedCmd.length).trim();
				}

				resolve(clean.length > 0 ? clean : '(Command completed with no terminal output)');
			};

			const dataListener = terminal.onData(data => {
				output += data;
				if (idleTimer) clearTimeout(idleTimer);
				// If no new data arrives for 850ms, assume command execution finished
				idleTimer = setTimeout(finish, 850);
			});

			// Max timeout: 30 seconds for long interactive commands
			maxTimer = setTimeout(finish, 30000);

			if (token.isCancellationRequested) {
				cleanUp();
				resolve('(Command cancelled by user)');
				return;
			}

			token.onCancellationRequested(() => {
				if (!isResolved) {
					isResolved = true;
					cleanUp();
					resolve(output ? removeAnsiEscapeCodes(output).trim() : '(Command cancelled by user)');
				}
			});

			// Send command to headless background terminal
			terminal.sendText(command, true);

			// Initial idle fallback (gives initial 2.5s for command to execute/settle)
			idleTimer = setTimeout(finish, 2500);
		});
	}

	/**
	 * Reads file content from the workspace with line numbers and optional slicing.
	 */
	private async _readFile(filePath: string, startLine?: number, endLine?: number): Promise<string> {
		const fileUri = this._resolveWorkspaceUri(filePath);
		if (!fileUri) {
			return `Error: Could not resolve path "${filePath}" in workspace.`;
		}
		try {
			const exists = await this._fileService.exists(fileUri);
			if (!exists) {
				return `Error: File "${filePath}" does not exist.`;
			}
			const fileBuffer = await this._fileService.readFile(fileUri);
			const text = fileBuffer.value.toString();
			const lines = text.split('\n');

			if (startLine !== undefined && endLine !== undefined) {
				const start = Math.max(1, startLine) - 1;
				const end = Math.min(lines.length, endLine);
				const sliced = lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join('\n');
				return `File: ${filePath} (lines ${start + 1}-${end} of ${lines.length}):\n${sliced}`;
			}

			if (text.length > 60000) {
				return `File: ${filePath} (first 500 lines shown):\n` + lines.slice(0, 500).map((l, i) => `${i + 1}: ${l}`).join('\n');
			}
			return `File: ${filePath} (${lines.length} lines):\n` + lines.map((l, i) => `${i + 1}: ${l}`).join('\n');
		} catch (e: any) {
			return `Error reading "${filePath}": ${e.message}`;
		}
	}

	/**
	 * Creates or overwrites a file and opens it in an editor tab.
	 */
	private async _writeFile(filePath: string, content: string): Promise<string> {
		const fileUri = this._resolveWorkspaceUri(filePath);
		if (!fileUri) {
			return `Error: Could not resolve path "${filePath}" in workspace.`;
		}
		try {
			await this._fileService.writeFile(fileUri, VSBuffer.fromString(content));
			try {
				await this._editorService.openEditor({ resource: fileUri });
			} catch {}
			const lines = content.split('\n').length;
			return `Successfully created/updated "${filePath}" (${lines} lines). Opened in editor.`;
		} catch (e: any) {
			return `Error writing "${filePath}": ${e.message}`;
		}
	}

	/**
	 * Surgically replaces a search block with a replacement block in an existing file.
	 */
	private async _editFile(filePath: string, search: string, replace: string): Promise<string> {
		const fileUri = this._resolveWorkspaceUri(filePath);
		if (!fileUri) {
			return `Error: Could not resolve path "${filePath}" in workspace.`;
		}
		try {
			const exists = await this._fileService.exists(fileUri);
			if (!exists) {
				return `Error: File "${filePath}" does not exist.`;
			}
			const existingContent = (await this._fileService.readFile(fileUri)).value.toString();
			if (!existingContent.includes(search)) {
				return `Error: Search block not found in "${filePath}". Verify whitespace and line endings.`;
			}
			const patched = existingContent.replace(search, replace);
			await this._fileService.writeFile(fileUri, VSBuffer.fromString(patched));
			try {
				await this._editorService.openEditor({ resource: fileUri });
			} catch {}
			return `Successfully applied surgical edit to "${filePath}".`;
		} catch (e: any) {
			return `Error editing "${filePath}": ${e.message}`;
		}
	}

	/**
	 * Lists directory contents with metadata.
	 */
	private async _listDir(dirPath?: string): Promise<string> {
		const uri = dirPath ? this._resolveWorkspaceUri(dirPath) : this._workspaceContextService.getWorkspace().folders[0]?.uri;
		if (!uri) {
			return 'Error: No workspace folder opened.';
		}
		try {
			const stat = await this._fileService.resolve(uri, { resolveMetadata: true });
			if (!stat.isDirectory || !stat.children) {
				return `Path "${dirPath || '.'}" is not a directory.`;
			}
			const items: string[] = [];
			for (const child of stat.children) {
				const isDir = child.isDirectory;
				const size = child.size !== undefined ? ` (${child.size} bytes)` : '';
				items.push(`${isDir ? '[DIR] ' : '[FILE]'} ${child.name}${size}`);
			}
			return `Directory listing of "${dirPath || '.'}" (${items.length} items):\n` + items.join('\n');
		} catch (e: any) {
			return `Error listing "${dirPath || '.'}": ${e.message}`;
		}
	}

	/**
	 * Searches workspace files for query string or regex.
	 */
	private async _grepSearch(query: string, searchPath?: string): Promise<string> {
		const rootUri = searchPath ? this._resolveWorkspaceUri(searchPath) : this._workspaceContextService.getWorkspace().folders[0]?.uri;
		if (!rootUri) {
			return 'Error: No workspace folder opened.';
		}
		try {
			const matches: string[] = [];
			const traverse = async (uri: URI, depth: number) => {
				if (depth > 6 || matches.length >= 35) return;
				const stat = await this._fileService.resolve(uri);
				if (!stat.children) return;
				for (const child of stat.children) {
					if (['node_modules', '.git', 'out', '.build', 'dist', '.vscode-test'].includes(child.name)) {
						continue;
					}
					if (child.isDirectory) {
						await traverse(child.resource, depth + 1);
					} else if (child.size && child.size < 150000) {
						try {
							const content = (await this._fileService.readFile(child.resource)).value.toString();
							if (content.toLowerCase().includes(query.toLowerCase())) {
								const lines = content.split('\n');
								for (let i = 0; i < lines.length; i++) {
									if (lines[i].toLowerCase().includes(query.toLowerCase())) {
										matches.push(`${child.name}:${i + 1}: ${lines[i].trim()}`);
										if (matches.length >= 35) break;
									}
								}
							}
						} catch {}
					}
				}
			};
			await traverse(rootUri, 0);
			if (matches.length === 0) {
				return `No matches found for "${query}".`;
			}
			return `Found ${matches.length} matches for "${query}":\n` + matches.join('\n');
		} catch (e: any) {
			return `Error during search: ${e.message}`;
		}
	}

	/**
	 * Performs a live web search using DuckDuckGo to find documentation, tutorials, and answers.
	 */
	private async _webSearch(query: string, token: CancellationToken): Promise<string> {
		if (!query || !query.trim()) {
			return 'Error: No query provided to web_search.';
		}
		try {
			const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
				}
			});
			if (!res.ok) {
				return `Search failed with status ${res.status}: ${res.statusText}`;
			}
			const html = await res.text();
			const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
			const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

			const links: { title: string; url: string }[] = [];
			let lm: RegExpExecArray | null;
			while ((lm = linkRegex.exec(html)) !== null && links.length < 6) {
				let rawUrl = lm[1];
				if (rawUrl.includes('uddg=')) {
					const match = rawUrl.match(/uddg=([^&]+)/);
					if (match) {
						try { rawUrl = decodeURIComponent(match[1]); } catch {}
					}
				}
				links.push({
					title: lm[2].replace(/<[^>]+>/g, '').trim(),
					url: rawUrl
				});
			}

			const snippets: string[] = [];
			let sm: RegExpExecArray | null;
			while ((sm = snippetRegex.exec(html)) !== null && snippets.length < 6) {
				snippets.push(sm[1].replace(/<[^>]+>/g, '').trim());
			}

			if (links.length === 0) {
				return `No web results found for "${query}".`;
			}

			const formatted: string[] = [`Web Search Results for "${query}":\n`];
			for (let i = 0; i < links.length; i++) {
				formatted.push(`[${i + 1}] ${links[i].title}\nURL: ${links[i].url}\nSummary: ${snippets[i] || 'No snippet available.'}\n`);
			}
			return formatted.join('\n');
		} catch (e: any) {
			return `Web search error: ${e.message}`;
		}
	}

	/**
	 * Fetches and reads a web page, stripping markup and returning readable text.
	 */
	private async _fetchWebPage(url: string, token: CancellationToken): Promise<string> {
		if (!url || !url.trim()) {
			return 'Error: No URL provided to fetch_web_page.';
		}
		try {
			const res = await fetch(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
				}
			});
			if (!res.ok) {
				return `Failed to fetch URL ${url}: ${res.status} ${res.statusText}`;
			}
			const html = await res.text();
			const clean = html
				.replace(/<script[\s\S]*?<\/script>/gi, '')
				.replace(/<style[\s\S]*?<\/style>/gi, '')
				.replace(/<nav[\s\S]*?<\/nav>/gi, '')
				.replace(/<footer[\s\S]*?<\/footer>/gi, '')
				.replace(/<header[\s\S]*?<\/header>/gi, '')
				.replace(/<[^>]+>/g, ' ')
				.replace(/&nbsp;/g, ' ')
				.replace(/&amp;/g, '&')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&#39;/g, "'")
				.replace(/&quot;/g, '"')
				.replace(/\s+/g, ' ')
				.trim();

			if (!clean) {
				return `(Fetched page ${url} but no readable text was extracted)`;
			}
			return `Page content for ${url} (first 5000 characters):\n${clean.slice(0, 5000)}`;
		} catch (e: any) {
			return `Error fetching web page "${url}": ${e.message}`;
		}
	}

	// ==========================================================
	// 6. TOOL PARSING & PASSIVE ACTION HANDLERS
	// ==========================================================

	/**
	 * Universal Tool Call Extractor: parses XML, JSON, bracket, and script blocks.
	 */
	private _extractToolCalls(text: string): IExtractedToolCall[] {
		const toolCalls: IExtractedToolCall[] = [];

		// 1. XML style: <tool_call> ... </tool_call>
		const xmlRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
		let xmlMatch: RegExpExecArray | null;
		while ((xmlMatch = xmlRegex.exec(text)) !== null) {
			const raw = xmlMatch[1].trim();
			try {
				const parsed = JSON.parse(raw);
				if (parsed.name) {
					toolCalls.push({ name: parsed.name, args: parsed.arguments || parsed.args || {}, raw: xmlMatch[0] });
					continue;
				}
			} catch {}

			// Sub-tags: <name>...</name> and <arguments>...</arguments>
			const nameMatch = raw.match(/<name>(.*?)<\/name>/i);
			const argsMatch = raw.match(/<arguments>([\s\S]*?)<\/arguments>/i);
			if (nameMatch) {
				let parsedArgs = {};
				if (argsMatch) {
					try { parsedArgs = JSON.parse(argsMatch[1]); } catch {}
				}
				toolCalls.push({ name: nameMatch[1].trim(), args: parsedArgs, raw: xmlMatch[0] });
			}
		}

		// 2. Markdown tool block: ```tool:name ... ```
		const toolBlockRegex = /```tool:([a-zA-Z0-9_\-]+)\s*\n([\s\S]*?)```/gi;
		let tbMatch: RegExpExecArray | null;
		while ((tbMatch = toolBlockRegex.exec(text)) !== null) {
			const name = tbMatch[1].trim();
			let args = {};
			try { args = JSON.parse(tbMatch[2].trim()); } catch {}
			toolCalls.push({ name, args, raw: tbMatch[0] });
		}

		// 3. Bracket format: [run_command(command="...")] or [web_search(query="...")] or [fetch_web_page(url="...")]
		const bracketRegex = /\[(run_command|run_in_terminal|execute_command|read_file|write_file|edit_file|list_dir|grep_search|web_search|search_web|fetch_web_page|read_url|fetch_page)\s*\(\s*(?:command|cmd|path|query|url)?\s*=?\s*['"]?([^'")\]]+)['"]?\s*\)\]/gi;
		let brMatch: RegExpExecArray | null;
		while ((brMatch = bracketRegex.exec(text)) !== null) {
			const name = brMatch[1];
			const val = brMatch[2];
			const argKey = (name.includes('command') || name.includes('terminal'))
				? 'command'
				: (name.includes('file') || name.includes('dir'))
				? 'path'
				: (name.includes('search') || name.includes('query'))
				? 'query'
				: 'url';
			toolCalls.push({ name, args: { [argKey]: val }, raw: brMatch[0] });
		}

		// 4. Executable script block: ```bash:run ... ```
		const runCodeBlockRegex = /```(?:bash|sh|powershell|cmd):run\s*\n([\s\S]*?)```/gi;
		let rcbMatch: RegExpExecArray | null;
		while ((rcbMatch = runCodeBlockRegex.exec(text)) !== null) {
			if (rcbMatch[1] && rcbMatch[1].trim()) {
				toolCalls.push({ name: 'run_command', args: { command: rcbMatch[1].trim() }, raw: rcbMatch[0] });
			}
		}

		return toolCalls;
	}

	/**
	 * Handles passive code creation and surgical editing in final assistant messages.
	 */
	private async _handlePassiveCodeBlocks(fullContent: string, progress: (parts: IChatProgress[]) => void, token: CancellationToken): Promise<void> {
		// A. Surgical Search/Replace Blocks
		const patchRegex = /(?:###?\s*`?([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9]+)`?[\s\S]*?)?<{7}\s*SEARCH\s*\n([\s\S]*?)\n={7}\s*\n([\s\S]*?)\n>{7}/gi;
		let patchMatch: RegExpExecArray | null;
		while ((patchMatch = patchRegex.exec(fullContent)) !== null) {
			let targetFile = (patchMatch[1] || '').trim();
			if (!targetFile) {
				const activeEditor = this._codeEditorService.getActiveCodeEditor();
				if (activeEditor?.getModel()) {
					targetFile = basename(activeEditor.getModel()!.uri);
				}
			}
			if (targetFile) {
				const result = await this._editFile(targetFile, patchMatch[2], patchMatch[3]);
				progress([{ kind: 'markdownContent', content: new MarkdownString(`\n\n> ✏️ **${result}**\n\n`) }]);
			}
		}

		// B. Full File Generation Blocks
		const codeBlockRegex = /```([a-zA-Z0-9_\-]*)(?:[:\s]+([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9]+))\s*\n([\s\S]*?)```/g;
		let cbMatch: RegExpExecArray | null;
		while ((cbMatch = codeBlockRegex.exec(fullContent)) !== null) {
			const fileName = (cbMatch[2] || '').trim();
			const code = cbMatch[3];
			if (fileName && code) {
				const result = await this._writeFile(fileName, code);
				progress([{ kind: 'markdownContent', content: new MarkdownString(`\n\n> 📄 **${result}**\n\n`) }]);
			}
		}
	}

	/**
	 * Resolves a relative workspace path to an absolute URI.
	 */
	private _resolveWorkspaceUri(targetPath: string): URI | null {
		const workspaceFolders = this._workspaceContextService.getWorkspace().folders;
		const primaryFolder = workspaceFolders[0];
		if (!primaryFolder) return null;
		let clean = (targetPath || '').trim().replace(/^['"]|['"]$/g, '');
		if (clean.startsWith('/tmp/')) clean = clean.slice(5);
		else if (clean.startsWith('tmp/')) clean = clean.slice(4);
		clean = clean.replace(/^[/\\]+/, '').replace(/\\/g, '/');
		return joinPath(primaryFolder.uri, clean);
	}
}
