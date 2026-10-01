/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { InlineCompletion, InlineCompletionContext, InlineCompletions, InlineCompletionsProvider } from '../../../../../editor/common/languages.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IAresAiKeyManager } from './aresAiKeyManager.js';
import { ARES_AI_PROVIDERS } from './aresAiTypes.js';

export class AresAiCompletions extends Disposable implements InlineCompletionsProvider {

	private _lastAbort: AbortController | null = null;

	constructor(
		@ILanguageFeaturesService private readonly _languageFeaturesService: ILanguageFeaturesService,
		@IAresAiKeyManager private readonly _keyManager: IAresAiKeyManager,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
	) {
		super();
		this._register(this._languageFeaturesService.inlineCompletionsProvider.register('*', this));
	}

	async provideInlineCompletions(
		model: ITextModel,
		position: Position,
		_context: InlineCompletionContext,
		token: CancellationToken
	): Promise<InlineCompletions<InlineCompletion> | undefined> {
		if (token.isCancellationRequested) {
			return undefined;
		}

		if (this._configurationService.getValue<boolean>('editor.inlineSuggest.enabled') === false) {
			return undefined;
		}

		const copilotEnable = this._configurationService.getValue<Record<string, boolean>>('github.copilot.enable');
		if (copilotEnable) {
			const langSetting = copilotEnable[model.getLanguageId()];
			const globalSetting = copilotEnable['*'];
			if (langSetting === false || (langSetting !== true && globalSetting === false)) {
				return undefined;
			}
		}

		const startLine = Math.max(1, position.lineNumber - 25);
		const prefixRange = new Range(startLine, 1, position.lineNumber, position.column);
		const prefix = model.getValueInRange(prefixRange);
		if (!prefix.trim()) {
			return undefined;
		}

		const endLine = Math.min(model.getLineCount(), position.lineNumber + 10);
		const suffixRange = new Range(position.lineNumber, position.column, endLine, model.getLineMaxColumn(endLine));
		const suffix = model.getValueInRange(suffixRange);

		// 80ms Debounce
		await new Promise(r => setTimeout(r, 80));
		if (token.isCancellationRequested) {
			return undefined;
		}

		if (this._lastAbort) {
			try { this._lastAbort.abort(); } catch {}
		}
		const abortController = new AbortController();
		this._lastAbort = abortController;
		token.onCancellationRequested(() => abortController.abort());

		const groqKey = await this._keyManager.getApiKey('Groq');
		let endpoint = 'https://api.groq.com/openai/v1/chat/completions';
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		let modelId = 'qwen/qwen3.8-27b';

		if (groqKey) {
			headers['Authorization'] = `Bearer ${groqKey}`;
		} else {
			endpoint = `${ARES_AI_PROVIDERS['Ollama (Tunnel)'].baseUrl}/chat/completions`;
			modelId = 'qwen3.8-27b-uncensored-mtp';
		}

		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					model: modelId,
					messages: [
						{ role: 'system', content: 'You are an inline code autocomplete engine. Complete the user code cleanly. Output only the immediate completion code without explanations or markdown backticks.' },
						{ role: 'user', content: `Prefix:\n${prefix}\nSuffix:\n${suffix}` }
					],
					max_tokens: 64,
					temperature: 0.1,
					stop: ['\n\n', '```']
				}),
				signal: abortController.signal
			});

			if (res.ok) {
				const data = await res.json();
				const text = data.choices?.[0]?.message?.content || '';
				if (text && !token.isCancellationRequested) {
					return {
						items: [{
							insertText: text,
							range: Range.fromPositions(position)
						}]
					};
				}
			}
		} catch {
			return undefined;
		}

		return undefined;
	}

	freeInlineCompletions(): void {}
}
