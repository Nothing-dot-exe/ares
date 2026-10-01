/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ARES_AI_PROVIDERS, IAresAiChunk, IAresAiMessage, IAresAiProvider } from './aresAiTypes.js';

export function findProviderForModel(rawModelId: string | undefined): { providerName: string; modelId: string } {
	let modelId = (rawModelId || '').trim();
	if (modelId.startsWith('ares-ai/')) {
		modelId = modelId.slice('ares-ai/'.length);
	} else if (modelId.startsWith('universal-ai/')) {
		modelId = modelId.slice('universal-ai/'.length);
	}

	if (!modelId) {
		return { providerName: 'Groq', modelId: 'openai/gpt-oss-120b' };
	}

	for (const [pName, pConfig] of Object.entries(ARES_AI_PROVIDERS)) {
		if (pConfig.models.some(m => m.id === modelId)) {
			return { providerName: pName, modelId };
		}
	}

	if (modelId.includes('qwen3.8') || modelId.includes('uncensored') || modelId.includes('JonathanColetti')) {
		return { providerName: 'Ollama (Tunnel)', modelId };
	}
	if (modelId.includes('qwen2.5-coder') || modelId.includes('deepseek-r1') || modelId.includes('localhost')) {
		return { providerName: 'Local Ollama', modelId };
	}
	if (modelId.includes(':free') || modelId.startsWith('liquid/') || modelId.includes('nemotron')) {
		return { providerName: 'OpenRouter', modelId };
	}
	if (modelId.startsWith('meta/') || modelId.startsWith('nvidia/')) {
		return { providerName: 'NVIDIA', modelId };
	}

	return { providerName: 'Groq', modelId: 'openai/gpt-oss-120b' };
}

export async function streamChatCompletion(
	providerName: string,
	apiKey: string,
	modelId: string,
	messages: readonly IAresAiMessage[],
	onChunk: (chunk: IAresAiChunk) => void,
	token: CancellationToken,
	customBaseUrl?: string
): Promise<void> {
	const provider: IAresAiProvider = ARES_AI_PROVIDERS[providerName] || ARES_AI_PROVIDERS['Groq'];
	const baseUrl = customBaseUrl || provider.baseUrl;
	const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (apiKey && apiKey !== 'none') {
		headers['Authorization'] = `Bearer ${apiKey}`;
	}

	const controller = new AbortController();
	token.onCancellationRequested(() => {
		try { controller.abort(); } catch {}
	});

	let activeModel = modelId || provider.defaultModel;
	if (providerName === 'Ollama (Tunnel)' && !activeModel.includes('qwen3.8')) {
		activeModel = 'qwen3.8-27b-uncensored-mtp';
	}

	let response: Response;
	try {
		response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model: activeModel,
				messages,
				stream: true
			}),
			signal: controller.signal
		});
	} catch (err: any) {
		if (err.name === 'AbortError' || token.isCancellationRequested) {
			return;
		}
		throw new Error(`Connection error to ${providerName}: ${err.message}`);
	}

	if (!response.ok) {
		const errorText = await response.text();
		if (response.status === 401 || response.status === 403) {
			throw new Error(`Authentication failure for ${providerName}: Invalid API key.`);
		}
		if (response.status === 404) {
			throw new Error(`Model "${activeModel}" is unavailable on ${providerName}.`);
		}
		if (response.status === 429) {
			throw new Error(`Rate limit reached on ${providerName}.`);
		}
		throw new Error(`HTTP ${response.status} from ${providerName}: ${errorText.slice(0, 150)}`);
	}

	const body = response.body;
	if (!body) {
		throw new Error(`Empty response stream from ${providerName}`);
	}

	const reader = body.getReader();
	const decoder = new TextDecoder('utf-8');
	let buffer = '';

	try {
		while (true) {
			if (token.isCancellationRequested) {
				await reader.cancel();
				break;
			}
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith(':')) continue;
				if (trimmed === 'data: [DONE]') return;
				if (trimmed.startsWith('data: ')) {
					try {
						const raw = trimmed.slice(6).trim();
						if (!raw) continue;
						const parsed = JSON.parse(raw);
						if (parsed.error) {
							const errMsg = parsed.error.message || JSON.stringify(parsed.error);
							onChunk({ content: `\n\n⚠️ **${providerName} Notice**: ${errMsg}\n\n` });
							return;
						}
						const delta = parsed.choices?.[0]?.delta;
						if (!delta) continue;
						const content = delta.content || '';
						const reasoning = delta.reasoning || delta.reasoning_content || '';
						if (content || reasoning) {
							onChunk({ content, reasoning });
						}
					} catch {}
				}
			}
		}
	} catch (err: any) {
		if (err.name === 'AbortError' || token.isCancellationRequested) {
			return;
		}
		throw err;
	}
}
