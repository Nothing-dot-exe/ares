/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
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
import { TerminalToolId } from '../../common/tools/terminalToolIds.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { IChatRequestVariableEntry } from '../../common/attachments/chatVariableEntries.js';
import { IAresAiKeyManager } from './aresAiKeyManager.js';
import { findProviderForModel, streamChatCompletion } from './aresAiClient.js';
import { ARES_AI_PROVIDERS, IAresAiMessage } from './aresAiTypes.js';

export class AresAiAgent implements IChatAgentImplementation {

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
					`### 🏛️ Ares AI — Native Core Capabilities\n\n` +
					`| Command / Feature | Syntax / Trigger | Description |\n` +
					`| :--- | :--- | :--- |\n` +
					`| **Autonomous Agent** | Default / Agent Mode | Multi-step reasoning, file generation, tool execution. |\n` +
					`| **Terminal Execution** | \`/terminal <cmd>\` | Runs commands in integrated terminal live. |\n` +
					`| **Surgical Editing** | \`/edit <request>\` | Search & replace patching on active files. |\n` +
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
			commandModifier = '\n[MODE: SURGICAL FILE EDITOR - Focus exclusively on outputting <<<<<<< SEARCH ... ======= ... >>>>>>> blocks for existing code files.]\n';
		} else if (request.command === 'terminal') {
			commandModifier = '\n[MODE: TERMINAL EXECUTION - Output [run_in_terminal(command="...")] to execute necessary commands directly.]\n';
		}

		const workspaceFolder = this._workspaceContextService.getWorkspace().folders[0];
		const resolveWorkspaceUri = (targetPath: string): URI | undefined => {
			let clean = (targetPath || '').trim().replace(/^['"]|['"]$/g, '');
			if (clean.startsWith('/tmp/')) clean = clean.slice(5);
			else if (clean.startsWith('tmp/')) clean = clean.slice(4);

			if (workspaceFolder) {
				return joinPath(workspaceFolder.uri, clean);
			}
			return URI.file(clean);
		};

		// 1. Gather Active Editor Context & Selection (Milestone 3)
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

		// 2. Gather Attached Files and Variables (#file attachments) (Milestone 3)
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

		const systemPrompt = `You are Ares AI, the intelligent autonomous coding assistant built directly into Ares IDE core.
You have direct autonomous capabilities inside the editor, workspace, and terminal:

1. CREATING COMPLETE CODE & WEBSITES:
   Always generate 100% COMPLETE, production-ready code. Never omit code or leave placeholders.
   Format files in standard markdown code blocks with the file path after the language tag:
   \`\`\`html:index.html
   <!DOCTYPE html>
   ...
   \`\`\`
   \`\`\`css:style.css
   ...
   \`\`\`
   \`\`\`javascript:script.js
   ...
   \`\`\`

2. SURGICAL FILE EDITING (PATCHING):
   To update or edit existing files, specify the file name and provide search/replace blocks:
   ### \`path/to/file.ext\`
   <<<<<<< SEARCH
   original code to replace
   =======
   new replacement code
   >>>>>>>

3. EXECUTING TERMINAL COMMANDS:
   To run commands, install dependencies, compile, or start dev servers:
   [run_in_terminal(command='npm install')]
   or
   \`\`\`bash:run
   npm run build
   \`\`\`
   Ares IDE will immediately execute the command in the built-in terminal!

4. CREATING DIRECTORIES:
   [create_directory(dirPath='my_folder')]

Ares IDE core automatically extracts all your tool actions and applies them live!`;

		// 3. Build Multi-Turn Conversation History (Milestone 1)
		const messages: IAresAiMessage[] = [
			{ role: 'system', content: systemPrompt }
		];

		// Unpack past history entries (request + response)
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

		// Prune oldest turns if conversation grows too long (keep system + last 18 turns)
		if (messages.length > 20) {
			const systemMsg = messages[0];
			const recentTurns = messages.slice(-18);
			messages.length = 0;
			messages.push(systemMsg, ...recentTurns);
		}

		// Append the active user prompt with command modifier, editor & attachment context
		const effectiveUserPrompt = request.message + commandModifier + editorContext + attachmentContext;
		messages.push({ role: 'user', content: effectiveUserPrompt });

		this._logService.trace(`[AresAiAgent] Invoking ${providerName} (${modelId}) with ${messages.length} message turns.`);

		let fullContent = '';
		let isThinking = false;

		try {
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
						fullContent += content;
						if (isThinking) {
							progress([{ kind: 'markdownContent', content: new MarkdownString(`\n\n---\n\n`) }]);
							isThinking = false;
						}
						if (!content.includes('<|tool_call_start|>') && !content.includes('<|tool_call_end|>')) {
							progress([{ kind: 'markdownContent', content: new MarkdownString(content) }]);
						}
					}
				},
				token,
				customBaseUrl
			);

			// ==========================================================
			// 4. AUTONOMOUS TOOL & WORKSPACE EXECUTION (Milestones 1 & 2)
			// ==========================================================

			// A. Extract & Execute Terminal Commands (RunInTerminalTool / ITerminalService)
			const terminalCommands: string[] = [];
			const cmdRegex = /(?:\[run_in_terminal\s*\(\s*(?:command|cmd)?\s*=?\s*['"]?([^'")\]]+)['"]?\s*\)\])|(?:\[execute_command\s*\(\s*(?:command|cmd)?\s*=?\s*['"]?([^'")\]]+)['"]?\s*\)\])/gi;
			for (const cm of fullContent.matchAll(cmdRegex)) {
				const cmd = cm[1] || cm[2];
				if (cmd && cmd.trim()) terminalCommands.push(cmd.trim());
			}

			// Also capture code blocks marked with bash:run / sh:run / powershell:run
			const runCodeBlockRegex = /```(?:bash|sh|powershell|cmd):run\s*\n([\s\S]*?)```/gi;
			for (const rm of fullContent.matchAll(runCodeBlockRegex)) {
				if (rm[1] && rm[1].trim()) {
					terminalCommands.push(rm[1].trim());
				}
			}

			if (terminalCommands.length > 0) {
				for (const cmd of terminalCommands) {
					try {
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n> ⚡ **Executing Terminal Command:** \`${cmd}\`\n\n`)
						}]);

						// 1. Dispatch through ILanguageModelToolsService if RunInTerminal is available
						const runInTerminalTool = this._toolsService.getTool(TerminalToolId.RunInTerminal) || this._toolsService.getTool('run_in_terminal');
						if (runInTerminalTool) {
							await this._toolsService.invokeTool({
								callId: generateUuid(),
								toolId: runInTerminalTool.id,
								parameters: {
									command: cmd,
									explanation: `Ares AI executing: ${cmd}`,
									mode: 'sync'
								},
								context: {
									sessionResource: request.sessionResource,
									requestId: request.requestId,
									workingDirectory: workspaceFolder?.uri
								}
							}, async () => 0, token);
						}

						// 2. Also ensure terminal is visibly revealed and command is executed in live terminal
						const terminalInstance = await this._terminalService.getActiveOrCreateInstance();
						if (terminalInstance) {
							await this._terminalService.revealTerminal(terminalInstance, false);
							terminalInstance.sendText(cmd, true);
						}
					} catch (e: any) {
						this._logService.warn(`[AresAiAgent] Error running terminal command "${cmd}":`, e);
					}
				}
			}

			// B. Extract & Execute Surgical File Edits (EditTool / Search-and-Replace)
			const editFileBlocks: { targetFile: string; search: string; replace: string }[] = [];
			const patchRegex = /(?:###?\s*`?([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9]+)`?[\s\S]*?)?<{7}\s*SEARCH\s*\n([\s\S]*?)\n={7}\s*\n([\s\S]*?)\n>{7}/gi;
			let patchMatch: RegExpExecArray | null;
			while ((patchMatch = patchRegex.exec(fullContent)) !== null) {
				let targetFile = (patchMatch[1] || '').trim();
				const searchBlock = patchMatch[2];
				const replaceBlock = patchMatch[3];

				if (!targetFile) {
					// Fall back to active editor file if known
					const activeEditor = this._codeEditorService.getActiveCodeEditor();
					if (activeEditor?.getModel()) {
						targetFile = basename(activeEditor.getModel()!.uri);
					}
				}

				if (targetFile && searchBlock) {
					editFileBlocks.push({ targetFile, search: searchBlock, replace: replaceBlock });
				}
			}

			for (const edit of editFileBlocks) {
				try {
					const fileUri = resolveWorkspaceUri(edit.targetFile);
					if (fileUri) {
						const exists = await this._fileService.exists(fileUri);
						if (exists) {
							const existingContent = (await this._fileService.readFile(fileUri)).value.toString();
							if (existingContent.includes(edit.search)) {
								const patched = existingContent.replace(edit.search, edit.replace);
								await this._fileService.writeFile(fileUri, VSBuffer.fromString(patched));
								progress([{
									kind: 'markdownContent',
									content: new MarkdownString(`\n\n> ✏️ **Patched File:** \`${edit.targetFile}\` via surgical edit.\n\n`)
								}]);
							} else {
								this._logService.warn(`[AresAiAgent] Search block not found in ${edit.targetFile}`);
							}
						}
					}
				} catch (e: any) {
					this._logService.warn(`[AresAiAgent] Could not apply edit to ${edit.targetFile}:`, e);
				}
			}

			// C. Extract & Create Directories
			const extractedDirs: string[] = [];
			const dirCalls = fullContent.matchAll(/(?:create_directory|create_folder|mkdir)\s*\(\s*(?:dirPath|path)?\s*=?\s*['"]?([^\s'")]+)['"]?\s*\)/gi);
			for (const dm of dirCalls) {
				if (dm[1]) extractedDirs.push(dm[1].trim());
			}

			const nlDir = request.message.match(/(?:create|make|mkdir|build)\s+(?:a\s+|one\s+)?(?:folder|directory|dir)\s+(?:called|named\s+)?['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i);
			if (nlDir && nlDir[1] && !['called', 'named', 'a', 'one', 'folder', 'directory'].includes(nlDir[1].toLowerCase())) {
				extractedDirs.push(nlDir[1].trim());
			}

			const uniqueDirs = [...new Set(extractedDirs)];
			for (const dirName of uniqueDirs) {
				try {
					const dirUri = resolveWorkspaceUri(dirName);
					if (dirUri) {
						await this._fileService.createFolder(dirUri);
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n> 📁 **Created Directory:** \`${basename(dirUri)}\` in workspace via \`IFileService\`.\n\n`)
						}]);
					}
				} catch (e: any) {
					this._logService.warn(`[AresAiAgent] Could not create directory ${dirName}:`, e);
				}
			}

			// D. Extract & Create Full Code Files
			const extractedFiles: { path: string; content: string }[] = [];
			const codeBlockRegex = /```([a-zA-Z0-9_\-]*)(?:[:\s]+([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9]+))?\s*\n([\s\S]*?)```/g;
			let cbMatch: RegExpExecArray | null;
			while ((cbMatch = codeBlockRegex.exec(fullContent)) !== null) {
				const lang = (cbMatch[1] || '').trim().toLowerCase();
				let fileName = (cbMatch[2] || '').trim();
				const code = cbMatch[3];

				if (!fileName) {
					const preceding = fullContent.slice(Math.max(0, cbMatch.index - 120), cbMatch.index);
					const preMatch = preceding.match(/(?:###?|File:|Filename:|\*\*)\s*`?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)`?/i);
					if (preMatch && preMatch[1]) {
						fileName = preMatch[1].trim();
					}
				}

				if (!fileName && code) {
					const firstLine = code.split('\n')[0].trim();
					const commentMatch = firstLine.match(/^(?:<!--|\/\/|\/\*|#)\s*([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)/i);
					if (commentMatch && commentMatch[1]) {
						fileName = commentMatch[1].trim();
					}
				}

				if (!fileName) {
					if (lang === 'html') fileName = 'index.html';
					else if (lang === 'css') fileName = 'style.css';
					else if (lang === 'javascript' || lang === 'js') fileName = 'script.js';
					else if (lang === 'json' && code.includes('"name"')) fileName = 'package.json';
					else if (lang === 'python' || lang === 'py') fileName = 'app.py';
				}

				if (fileName && code && code.trim().length > 0 && !fileName.endsWith(':run')) {
					const cleanPath = basename(URI.file(fileName));
					const existing = extractedFiles.find(f => f.path.toLowerCase() === cleanPath.toLowerCase());
					if (existing) {
						existing.content = code;
					} else {
						extractedFiles.push({ path: cleanPath, content: code });
					}
				}
			}

			let primaryFileUri: URI | undefined = undefined;
			for (const file of extractedFiles) {
				try {
					const fileUri = resolveWorkspaceUri(file.path);
					if (fileUri) {
						await this._fileService.writeFile(fileUri, VSBuffer.fromString(file.content));
						const lineCount = file.content.split('\n').length;
						progress([{
							kind: 'markdownContent',
							content: new MarkdownString(`\n\n> 📄 **Created File:** \`${file.path}\` (${lineCount} lines) in workspace via \`IFileService\`.\n\n`)
						}]);
						if (!primaryFileUri || file.path === 'index.html' || file.path.endsWith('.html')) {
							primaryFileUri = fileUri;
						}
					}
				} catch (e: any) {
					this._logService.warn(`[AresAiAgent] Could not write file ${file.path}:`, e);
				}
			}

			// Open primary created file in editor tab
			if (primaryFileUri) {
				try {
					await this._editorService.openEditor({ resource: primaryFileUri });
				} catch (e) {
					this._logService.warn('[AresAiAgent] Could not open editor for file:', e);
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
}
