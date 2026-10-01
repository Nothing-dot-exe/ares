/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ISecretStorageService } from '../../../../../platform/secrets/common/secrets.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';

export const IAresAiKeyManager = createDecorator<IAresAiKeyManager>('aresAiKeyManager');

export interface IAresAiKeyManager {
	readonly _serviceBrand: undefined;
	getApiKey(providerName: string): Promise<string>;
	saveApiKey(providerName: string, key: string): Promise<void>;
	testConnection(providerName: string): Promise<{ ok: boolean; latency?: number; message?: string; error?: string }>;
}

const EMBEDDED_KEYS: Record<string, string> = {
	'Groq': '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',
	'OpenRouter': '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',
	'NVIDIA': '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'
};

export class AresAiKeyManager extends Disposable implements IAresAiKeyManager {
	declare readonly _serviceBrand: undefined;

	private readonly _cachedKeys = new Map<string, string>(Object.entries(EMBEDDED_KEYS));

	constructor(
		@ISecretStorageService private readonly _secretStorageService: ISecretStorageService,
		@IWorkspaceContextService private readonly _workspaceContextService: IWorkspaceContextService,
		@ILogService private readonly _logService: ILogService,
	) {
		super();
		this._loadLocalKeys();
	}

	private async _loadLocalKeys(): Promise<void> {
		try {
			// Pre-seed known providers
			for (const [prov, key] of Object.entries(EMBEDDED_KEYS)) {
				const stored = await this._secretStorageService.get(`aresAi.apiKey.${prov}`);
				if (stored) {
					this._cachedKeys.set(prov, stored);
				} else if (key) {
					this._cachedKeys.set(prov, key);
				}
			}
		} catch (e) {
			this._logService.warn('[AresAiKeyManager] Secret storage read notice:', e);
		}
	}

	async getApiKey(providerName: string): Promise<string> {
		if (providerName === 'Local Ollama' || providerName === 'Ollama (Tunnel)') {
			return 'none';
		}

		if (this._cachedKeys.has(providerName)) {
			const k = this._cachedKeys.get(providerName)!;
			if (k) return k;
		}

		try {
			const secret = await this._secretStorageService.get(`aresAi.apiKey.${providerName}`);
			if (secret) {
				this._cachedKeys.set(providerName, secret);
				return secret;
			}
		} catch {}

		// Check environment variables
		if (providerName === 'Groq' && typeof process !== 'undefined' && process.env?.GROQ_API_KEY) {
			return process.env.GROQ_API_KEY;
		}
		if (providerName === 'OpenRouter' && typeof process !== 'undefined' && process.env?.OPENROUTER_API_KEY) {
			return process.env.OPENROUTER_API_KEY;
		}
		if (providerName === 'NVIDIA' && typeof process !== 'undefined' && process.env?.NVIDIA_API_KEY) {
			return process.env.NVIDIA_API_KEY;
		}

		return EMBEDDED_KEYS[providerName] || '';
	}

	async saveApiKey(providerName: string, key: string): Promise<void> {
		const clean = (key || '').trim();
		this._cachedKeys.set(providerName, clean);
		try {
			if (clean) {
				await this._secretStorageService.set(`aresAi.apiKey.${providerName}`, clean);
			} else {
				await this._secretStorageService.delete(`aresAi.apiKey.${providerName}`);
			}
		} catch (e) {
			this._logService.warn(`[AresAiKeyManager] Failed to persist key for ${providerName}:`, e);
		}
	}

	async testConnection(providerName: string): Promise<{ ok: boolean; latency?: number; message?: string; error?: string }> {
		const key = await this.getApiKey(providerName);
		const startTime = Date.now();
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 6000);

		try {
			if (providerName === 'Local Ollama') {
				const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
				clearTimeout(timeoutId);
				const latency = Date.now() - startTime;
				if (res.ok) return { ok: true, latency, message: `Local Ollama is online (${latency}ms)` };
				return { ok: false, error: `Local Ollama returned HTTP ${res.status}` };
			}
			if (providerName === 'Ollama (Tunnel)') {
				const res = await fetch('https://nitrogen-tagged-cradle-specifications.trycloudflare.com/api/tags', { signal: controller.signal });
				clearTimeout(timeoutId);
				const latency = Date.now() - startTime;
				if (res.ok) return { ok: true, latency, message: `Ollama Tunnel is online (${latency}ms)` };
				return { ok: false, error: `Ollama Tunnel returned HTTP ${res.status}` };
			}

			if (!key) {
				clearTimeout(timeoutId);
				return { ok: false, error: 'No API key configured' };
			}

			let testUrl = 'https://api.groq.com/openai/v1/models';
			if (providerName === 'OpenRouter') testUrl = 'https://openrouter.ai/api/v1/auth/key';
			if (providerName === 'NVIDIA') testUrl = 'https://integrate.api.nvidia.com/v1/models';

			const res = await fetch(testUrl, {
				headers: { 'Authorization': `Bearer ${key}` },
				signal: controller.signal
			});
			clearTimeout(timeoutId);
			const latency = Date.now() - startTime;

			if (res.ok) {
				return { ok: true, latency, message: `${providerName} key verified (${latency}ms)` };
			}
			return { ok: false, error: `${providerName} returned HTTP ${res.status}` };
		} catch (err: any) {
			clearTimeout(timeoutId);
			return { ok: false, error: err.name === 'AbortError' ? 'Connection timed out' : err.message };
		}
	}
}
