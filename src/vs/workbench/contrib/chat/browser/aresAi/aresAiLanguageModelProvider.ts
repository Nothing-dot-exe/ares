/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AsyncIterableSource } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { IChatMessage, IChatResponsePart, ILanguageModelChatMetadataAndIdentifier, ILanguageModelChatProvider, ILanguageModelChatRequestOptions, ILanguageModelChatResponse, ILanguageModelsService } from '../../common/languageModels.js';
import { IAresAiKeyManager } from './aresAiKeyManager.js';
import { findProviderForModel, streamChatCompletion } from './aresAiClient.js';
import { ARES_AI_PROVIDERS, IAresAiMessage } from './aresAiTypes.js';

export class AresAiLanguageModelProvider extends Disposable implements ILanguageModelChatProvider {

	private readonly _onDidChange = this._register(new Emitter<void>());
	readonly onDidChange: Event<void> = this._onDidChange.event;

	constructor(
		@ILanguageModelsService private readonly _languageModelsService: ILanguageModelsService,
		@IAresAiKeyManager private readonly _keyManager: IAresAiKeyManager,
	) {
		super();
		this._registerProviders();
	}

	private _registerProviders(): void {
		try {
			// Register under both 'universal-ai' and 'ares-ai' so both vendor namespaces work seamlessly
			this._register(this._languageModelsService.registerLanguageModelProvider('universal-ai', this));
			this._register(this._languageModelsService.registerLanguageModelProvider('ares-ai', this));
		} catch (e) {
			console.warn('[AresAiLanguageModelProvider] Registration notice:', e);
		}
	}

	async provideLanguageModelChatInfo(): Promise<ILanguageModelChatMetadataAndIdentifier[]> {
		const result: ILanguageModelChatMetadataAndIdentifier[] = [];

		for (const [pName, provider] of Object.entries(ARES_AI_PROVIDERS)) {
			for (const m of provider.models) {
				const isDefault = m.id === 'openai/gpt-oss-120b';
				result.push({
					identifier: m.id,
					metadata: {
						extension: new ExtensionIdentifier('ares.ai'),
						name: m.name,
						id: m.id,
						vendor: 'universal-ai',
						version: '1.0',
						family: m.family,
						maxInputTokens: m.maxInputTokens,
						maxOutputTokens: m.maxOutputTokens,
						isDefault,
						isDefaultForLocation: isDefault ? { [ChatAgentLocation.Chat]: true } : {},
						capabilities: m.capabilities
					}
				});
			}
		}

		return result;
	}

	async sendChatRequest(
		modelId: string,
		messages: IChatMessage[],
		_from: ExtensionIdentifier | undefined,
		_options: ILanguageModelChatRequestOptions,
		token: CancellationToken
	): Promise<ILanguageModelChatResponse> {
		const { providerName, modelId: resolvedModelId } = findProviderForModel(modelId);
		const apiKey = await this._keyManager.getApiKey(providerName);

		const formattedMessages: IAresAiMessage[] = messages.map(m => {
			let role: 'user' | 'assistant' | 'system' = 'user';
			if (m.role === 1 || (m.role as any) === 'assistant') {
				role = 'assistant';
			} else if ((m.role as any) === 'system') {
				role = 'system';
			}
			let text = '';
			if (typeof m.content === 'string') {
				text = m.content;
			} else if (Array.isArray(m.content)) {
				text = m.content.map(p => typeof p === 'string' ? p : ((p as any).value || (p as any).text || '')).join('');
			}
			return { role, content: text };
		});

		const stream = new AsyncIterableSource<IChatResponsePart>();

		const executePromise = streamChatCompletion(
			providerName,
			apiKey,
			resolvedModelId,
			formattedMessages,
			({ content, reasoning }) => {
				if (content) {
					stream.emitOne({ type: 'text', value: content });
				} else if (reasoning) {
					stream.emitOne({ type: 'text', value: reasoning });
				}
			},
			token
		).then(() => {
			stream.resolve();
		}).catch(err => {
			stream.reject(err);
		});

		return {
			stream: stream.asyncIterable,
			result: executePromise
		};
	}

	async provideTokenCount(_modelId: string, message: string | IChatMessage): Promise<number> {
		const str = typeof message === 'string' ? message : (typeof message.content === 'string' ? message.content : JSON.stringify(message.content));
		return Math.ceil(str.length / 4);
	}
}
