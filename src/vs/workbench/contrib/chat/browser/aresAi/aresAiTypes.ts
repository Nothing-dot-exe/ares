/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IAresAiModel {
	readonly id: string;
	readonly name: string;
	readonly family: string;
	readonly maxInputTokens: number;
	readonly maxOutputTokens: number;
	readonly capabilities: {
		readonly toolCalling?: boolean;
		readonly reasoning?: boolean;
		readonly local?: boolean;
		readonly offline?: boolean;
		readonly vision?: boolean;
	};
	readonly pricing?: string;
}

export interface IAresAiProvider {
	readonly name: string;
	readonly baseUrl: string;
	readonly defaultModel: string;
	readonly requiresKey: boolean;
	readonly models: readonly IAresAiModel[];
}

export const ARES_AI_PROVIDERS: Record<string, IAresAiProvider> = {
	'Groq': {
		name: 'Groq',
		baseUrl: 'https://api.groq.com/openai/v1',
		defaultModel: 'openai/gpt-oss-120b',
		requiresKey: true,
		models: [
			{ id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B (Groq · 128k)', family: 'gpt-oss', maxInputTokens: 128000, maxOutputTokens: 8192, capabilities: { toolCalling: true }, pricing: 'Free' },
			{ id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B (Groq · 128k)', family: 'qwen', maxInputTokens: 128000, maxOutputTokens: 8192, capabilities: { toolCalling: true }, pricing: 'Free' },
			{ id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B (Groq · 128k)', family: 'gpt-oss', maxInputTokens: 128000, maxOutputTokens: 8192, capabilities: { toolCalling: true }, pricing: 'Free' },
			{ id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq · 128k)', family: 'llama-3.3', maxInputTokens: 128000, maxOutputTokens: 8192, capabilities: { toolCalling: true }, pricing: 'Free' }
		]
	},
	'Ollama (Tunnel)': {
		name: 'Ollama (Cloudflare Tunnel)',
		baseUrl: 'https://nitrogen-tagged-cradle-specifications.trycloudflare.com/v1',
		defaultModel: 'qwen3.8-27b-uncensored-mtp',
		requiresKey: false,
		models: [
			{ id: 'qwen3.8-27b-uncensored-mtp', name: 'Qwen 3.8 27B Uncensored (Ollama · Tunnel)', family: 'qwen', maxInputTokens: 32768, maxOutputTokens: 8192, capabilities: { toolCalling: true, reasoning: true }, pricing: '100% Free' },
			{ id: 'hf.co/JonathanColetti/Qwen3.8-27B-Uncensored-GGUF:Q4_K_M', name: 'Qwen 3.8 27B GGUF (Ollama · Tunnel)', family: 'qwen', maxInputTokens: 32768, maxOutputTokens: 8192, capabilities: { toolCalling: true, reasoning: true }, pricing: '100% Free' }
		]
	},
	'Local Ollama': {
		name: 'Local Ollama',
		baseUrl: 'http://localhost:11434/v1',
		defaultModel: 'qwen2.5-coder:latest',
		requiresKey: false,
		models: [
			{ id: 'qwen2.5-coder:latest', name: 'Qwen 2.5 Coder (Local Ollama · Offline)', family: 'qwen2.5', maxInputTokens: 32768, maxOutputTokens: 4096, capabilities: { local: true, offline: true }, pricing: '100% Free' },
			{ id: 'qwen3.8-27b-uncensored-mtp', name: 'Qwen 3.8 27B (Local Ollama · Offline)', family: 'qwen', maxInputTokens: 32768, maxOutputTokens: 8192, capabilities: { local: true, offline: true, reasoning: true }, pricing: '100% Free' },
			{ id: 'llama3.2:latest', name: 'Llama 3.2 (Local Ollama · Offline)', family: 'llama3.2', maxInputTokens: 32768, maxOutputTokens: 4096, capabilities: { offline: true }, pricing: '100% Free' },
			{ id: 'deepseek-r1:latest', name: 'DeepSeek R1 (Local Ollama · Offline)', family: 'deepseek-r1', maxInputTokens: 32768, maxOutputTokens: 4096, capabilities: { reasoning: true, offline: true }, pricing: '100% Free' }
		]
	},
	'OpenRouter': {
		name: 'OpenRouter',
		baseUrl: 'https://openrouter.ai/api/v1',
		defaultModel: 'liquid/lfm-2.5-2.6b:free',
		requiresKey: true,
		models: [
			{ id: 'liquid/lfm-2.5-2.6b:free', name: 'LFM 2.5 2.6B (OpenRouter · Free)', family: 'lfm', maxInputTokens: 32768, maxOutputTokens: 4096, capabilities: { toolCalling: true }, pricing: 'Free' },
			{ id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5 (OpenRouter · Free)', family: 'nemotron', maxInputTokens: 128000, maxOutputTokens: 8192, capabilities: { toolCalling: true }, pricing: 'Free' }
		]
	},
	'NVIDIA': {
		name: 'NVIDIA NIM',
		baseUrl: 'https://integrate.api.nvidia.com/v1',
		defaultModel: 'meta/llama-3.2-11b-vision-instruct',
		requiresKey: true,
		models: [
			{ id: 'meta/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision (NVIDIA NIM · 128k)', family: 'llama-3.2', maxInputTokens: 128000, maxOutputTokens: 8192, capabilities: { vision: true, toolCalling: true }, pricing: 'Free Credits' }
		]
	}
};

export interface IAresAiMessage {
	readonly role: 'system' | 'user' | 'assistant';
	readonly content: string;
}

export interface IAresAiChunk {
	readonly content?: string;
	readonly reasoning?: string;
}
