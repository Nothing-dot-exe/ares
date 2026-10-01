/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IInstantiationService, ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { InstantiationType, registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../../common/contributions.js';
import { ChatAgentLocation, ChatModeKind } from '../../common/constants.js';
import { IChatAgentService } from '../../common/participants/chatAgents.js';
import { ChatContextKeys } from '../../common/actions/chatContextKeys.js';
import { ChatEntitlementContextKeys } from '../../../../services/chat/common/chatEntitlementService.js';
import { AresAiKeyManager, IAresAiKeyManager } from './aresAiKeyManager.js';
import { AresAiAgent } from './aresAiAgent.js';
import { AresAiCompletions } from './aresAiCompletions.js';
import { AresAiLanguageModelProvider } from './aresAiLanguageModelProvider.js';
import { ARES_AI_PROVIDERS } from './aresAiTypes.js';

// Register Key Manager as eager singleton
registerSingleton(IAresAiKeyManager, AresAiKeyManager, InstantiationType.Eager);

export class AresAiWorkbenchContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.aresAi';

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IChatAgentService private readonly _chatAgentService: IChatAgentService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@INotificationService private readonly _notificationService: INotificationService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
	) {
		super();
		this._initialize();
	}

	private _initialize(): void {
		// 1. Unlock all hidden AI capabilities and context keys
		ChatEntitlementContextKeys.clientByokEnabled.bindTo(this._contextKeyService).set(true);
		ChatEntitlementContextKeys.Setup.completed.bindTo(this._contextKeyService).set(true);
		ChatEntitlementContextKeys.Setup.installed.bindTo(this._contextKeyService).set(true);
		ChatEntitlementContextKeys.Setup.registered.bindTo(this._contextKeyService).set(true);
		ChatEntitlementContextKeys.Setup.hidden.bindTo(this._contextKeyService).set(false);
		ChatEntitlementContextKeys.Setup.disabled.bindTo(this._contextKeyService).set(false);
		ChatEntitlementContextKeys.Entitlement.signedOut.bindTo(this._contextKeyService).set(false);
		ChatEntitlementContextKeys.Entitlement.planFree.bindTo(this._contextKeyService).set(false);
		ChatEntitlementContextKeys.Entitlement.planEnterprise.bindTo(this._contextKeyService).set(true);
		ChatEntitlementContextKeys.chatQuotaExceeded.bindTo(this._contextKeyService).set(false);
		ChatEntitlementContextKeys.completionsQuotaExceeded.bindTo(this._contextKeyService).set(false);
		// hasByokModels = true ensures the chat widget renders instead of blank welcome screen
		ChatEntitlementContextKeys.hasByokModels.bindTo(this._contextKeyService).set(true);

		ChatContextKeys.languageModelsAreUserSelectable.bindTo(this._contextKeyService).set(true);
		ChatContextKeys.nonCopilotLanguageModelsAreUserSelectable.bindTo(this._contextKeyService).set(true);
		ChatContextKeys.agentSupportsAttachments.bindTo(this._contextKeyService).set(true);
		ChatContextKeys.Modes.hasCustomChatModes.bindTo(this._contextKeyService).set(true);
		ChatContextKeys.chatEditingCanUndo.bindTo(this._contextKeyService).set(true);
		ChatContextKeys.chatEditingCanRedo.bindTo(this._contextKeyService).set(true);
		ChatContextKeys.enabled.bindTo(this._contextKeyService).set(true);

		// 2. Instantiate Core Language Model Provider & Inline Completions
		this._instantiationService.createInstance(AresAiLanguageModelProvider);
		this._instantiationService.createInstance(AresAiCompletions);

		// 3. Instantiate Core Chat Agent
		const agentImpl = this._instantiationService.createInstance(AresAiAgent);

		// 4. Register Core Agent with All Modes & Slash Commands
		const agentData = {
			id: 'ares.ai',
			name: 'ai',
			fullName: 'Ares AI',
			description: 'Ares AI Native Autonomous Assistant',
			isDefault: true,
			isCore: true,
			canAccessPreviousChatHistory: true,
			locations: [ChatAgentLocation.Chat, ChatAgentLocation.Terminal, ChatAgentLocation.Notebook, ChatAgentLocation.Editor],
			modes: [ChatModeKind.Agent, ChatModeKind.Ask, ChatModeKind.Edit],
			extensionId: new ExtensionIdentifier('ares.ai'),
			extensionPublisherId: 'ares',
			extensionDisplayName: 'Ares IDE',
			extensionVersion: '1.0.0',
			slashCommands: [
				{ name: 'terminal', description: 'Run a command in the integrated terminal live' },
				{ name: 'edit', description: 'Apply surgical search-and-replace edits to the active file' },
				{ name: 'plan', description: 'Create an architectural decomposition or execution plan' },
				{ name: 'clear', description: 'Reset multi-turn conversation memory' },
				{ name: 'help', description: 'List all autonomous capabilities and models' },
			],
			disambiguation: [],
			metadata: { isSticky: false }
		};

		this._register(this._chatAgentService.registerAgent('ares.ai', agentData));
		this._register(this._chatAgentService.registerAgentImplementation('ares.ai', agentImpl));

		// Register 'universal-ai.chat' alias so any previous references immediately route to this core agent
		this._register(this._chatAgentService.registerAgent('universal-ai.chat', { ...agentData, id: 'universal-ai.chat' }));
		this._register(this._chatAgentService.registerAgentImplementation('universal-ai.chat', agentImpl));

		console.log('[Ares AI] Native Core AI Agent & All Hidden Features Unlocked.');
	}
}

registerWorkbenchContribution2(AresAiWorkbenchContribution.ID, AresAiWorkbenchContribution, WorkbenchPhase.BlockRestore);

// Register Core In-App Key & Provider Management Commands
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'ares.ai.selectProvider',
			title: localize2('aresAi.selectProvider', "Ares AI: Select Active Provider / Model"),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor, targetProvider?: string): Promise<void> {
		const quickInput = accessor.get(IQuickInputService);
		const configService = accessor.get(IConfigurationService);
		const notificationService = accessor.get(INotificationService);

		let chosen = targetProvider;
		if (!chosen) {
			const items = Object.entries(ARES_AI_PROVIDERS).map(([pName, pConfig]) => ({
				label: pName,
				description: pConfig.baseUrl,
				detail: `Default Model: ${pConfig.defaultModel}`
			}));
			const picked = await quickInput.pick(items, { placeHolder: 'Select active AI provider' });
			if (!picked) return;
			chosen = picked.label;
		}

		const defaultModel = ARES_AI_PROVIDERS[chosen]?.defaultModel || 'openai/gpt-oss-120b';
		await configService.updateValue('aresAi.provider', chosen);
		await configService.updateValue('aresAi.model', defaultModel);
		await configService.updateValue('universalAi.provider', chosen);
		await configService.updateValue('universalAi.model', defaultModel);
		await configService.updateValue('chat.defaultModel', `universal-ai/${defaultModel}`);

		notificationService.notify({
			severity: Severity.Info,
			message: `Ares AI switched to ${chosen} (${defaultModel})`
		});
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'ares.ai.setApiKey',
			title: localize2('aresAi.setApiKey', "Ares AI: Configure API Keys"),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor, targetProvider?: string): Promise<void> {
		const quickInput = accessor.get(IQuickInputService);
		const keyManager = accessor.get(IAresAiKeyManager);
		const configService = accessor.get(IConfigurationService);
		const notificationService = accessor.get(INotificationService);

		const prov = targetProvider || configService.getValue<string>('aresAi.provider') || 'Groq';
		const input = await quickInput.input({
			title: `Enter ${prov} API Key`,
			prompt: `Paste your ${prov} API key (saved securely in OS keychain, zero browser needed):`,
			password: true,
			ignoreFocusOut: true
		});

		if (input === undefined) return;
		await keyManager.saveApiKey(prov, input);
		notificationService.notify({
			severity: Severity.Info,
			message: `API Key saved for ${prov}.`
		});
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'ares.ai.testApiKey',
			title: localize2('aresAi.testApiKey', "Ares AI: Test Connection & Key Status"),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor, targetProvider?: string): Promise<void> {
		const keyManager = accessor.get(IAresAiKeyManager);
		const configService = accessor.get(IConfigurationService);
		const notificationService = accessor.get(INotificationService);

		const prov = targetProvider || configService.getValue<string>('aresAi.provider') || 'Groq';
		const res = await keyManager.testConnection(prov);

		if (res.ok) {
			notificationService.notify({
				severity: Severity.Info,
				message: `✅ ${prov} connected successfully! (${res.latency}ms)`
			});
		} else {
			notificationService.notify({
				severity: Severity.Error,
				message: `❌ ${prov} connection failed: ${res.error}`
			});
		}
	}
});

// Legacy command aliases so UI widget buttons continue working flawlessly
CommandsRegistry.registerCommand('universal-ai.selectProvider', (accessor, ...args) => {
	accessor.get(CommandsRegistry).getCommand('ares.ai.selectProvider')?.handler(accessor, ...args);
});
CommandsRegistry.registerCommand('universal-ai.setApiKey', (accessor, ...args) => {
	accessor.get(CommandsRegistry).getCommand('ares.ai.setApiKey')?.handler(accessor, ...args);
});
CommandsRegistry.registerCommand('universal-ai.testApiKey', (accessor, ...args) => {
	accessor.get(CommandsRegistry).getCommand('ares.ai.testApiKey')?.handler(accessor, ...args);
});
CommandsRegistry.registerCommand('universal-ai.addModel', (accessor, ...args) => {
	accessor.get(CommandsRegistry).getCommand('ares.ai.selectProvider')?.handler(accessor, ...args);
});
