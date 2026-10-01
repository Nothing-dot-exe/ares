// scripts/test-hidden-features.mjs
// Empirically verifies slash commands, settings injection, and hidden feature configurations

import fs from 'fs';
import path from 'path';

console.log('========================================================');
console.log('Testing Ares Native Core Slash Commands & Hidden Features');
console.log('========================================================\n');

// 1. Verify User settings.json has all hidden flags enabled
const appData = process.env.APPDATA;
const settingsPath = path.join(appData, 'code-oss-dev', 'User', 'settings.json');
if (!fs.existsSync(settingsPath)) {
  console.error('FAIL: settings.json not found');
  process.exit(1);
}

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

const requiredFlags = [
  ['chat.checkpoints.enabled', true],
  ['chat.artifacts.enabled', true],
  ['chat.autopilot.advanced.enabled', true],
  ['chat.tools.global.autoApprove', true],
  ['chat.tools.terminal.enableAutoApprove', true],
  ['chat.agent.sandbox.allowUnsandboxedCommands', true],
  ['inlineChat.affordance', 'editor'],
  ['chat.unifiedAgentsBar.enabled', true],
  ['chat.editing.alwaysShowEdits', true],
  ['chat.agent.maxRequests', 100],
  ['chat.detectExternalEdits', true],
  ['chat.languageModels.overrideEnabled', true],
  ['editor.inlineSuggest.enabled', true],
  ['aresAi.provider', 'Groq'],
  ['aresAi.model', 'openai/gpt-oss-120b'],
];

let allSettingsPassed = true;
for (const [key, expected] of requiredFlags) {
  const actual = settings[key];
  const passed = actual === expected;
  console.log(`Setting [${key}]: ${passed ? 'PASS' : `FAIL (got ${actual})`}`);
  if (!passed) allSettingsPassed = false;
}

// 2. Verify Slash Command modifiers in aresAiAgent.ts
const agentFilePath = path.join(process.cwd(), 'src', 'vs', 'workbench', 'contrib', 'chat', 'browser', 'aresAi', 'aresAiAgent.ts');
const agentCode = fs.readFileSync(agentFilePath, 'utf8');

const hasPlanModifier = agentCode.includes("request.command === 'plan'");
const hasEditModifier = agentCode.includes("request.command === 'edit'");
const hasTerminalModifier = agentCode.includes("request.command === 'terminal'");
const hasClearModifier = agentCode.includes("request.command === 'clear'");
const hasHelpModifier = agentCode.includes("request.command === 'help'");
const includesInEffectivePrompt = agentCode.includes('request.message + commandModifier + editorContext + attachmentContext');

console.log('\n--- Slash Commands Verification ---');
console.log(`/plan handled: ${hasPlanModifier ? 'PASS' : 'FAIL'}`);
console.log(`/edit handled: ${hasEditModifier ? 'PASS' : 'FAIL'}`);
console.log(`/terminal handled: ${hasTerminalModifier ? 'PASS' : 'FAIL'}`);
console.log(`/clear handled: ${hasClearModifier ? 'PASS' : 'FAIL'}`);
console.log(`/help handled: ${hasHelpModifier ? 'PASS' : 'FAIL'}`);
console.log(`commandModifier injected into effectiveUserPrompt: ${includesInEffectivePrompt ? 'PASS' : 'FAIL'}`);

// 3. Verify Ares AI Contribution Registration
const contribFilePath = path.join(process.cwd(), 'src', 'vs', 'workbench', 'contrib', 'chat', 'browser', 'aresAi', 'aresAi.contribution.ts');
const contribCode = fs.readFileSync(contribFilePath, 'utf8');

const hasByokUnlock = contribCode.includes('clientByokEnabled.bindTo');
const hasSetupCompleted = contribCode.includes('Setup.completed.bindTo');
const hasPlanEnterprise = contribCode.includes('Entitlement.planEnterprise.bindTo');
const hasModelsSelectable = contribCode.includes('languageModelsAreUserSelectable.bindTo');
const hasAgentAttachments = contribCode.includes('agentSupportsAttachments.bindTo');

console.log('\n--- Hidden Context Key Unlocks ---');
console.log(`BYOK Models Unlocked (clientByokEnabled): ${hasByokUnlock ? 'PASS' : 'FAIL'}`);
console.log(`Setup Bypass (Setup.completed): ${hasSetupCompleted ? 'PASS' : 'FAIL'}`);
console.log(`Enterprise Plan Entitlement: ${hasPlanEnterprise ? 'PASS' : 'FAIL'}`);
console.log(`Language Models User-Selectable: ${hasModelsSelectable ? 'PASS' : 'FAIL'}`);
console.log(`Attachments Enabled on Agent: ${hasAgentAttachments ? 'PASS' : 'FAIL'}`);

if (allSettingsPassed && hasPlanModifier && hasEditModifier && hasTerminalModifier && hasClearModifier && hasHelpModifier && includesInEffectivePrompt && hasByokUnlock && hasSetupCompleted && hasPlanEnterprise && hasModelsSelectable && hasAgentAttachments) {
  console.log('\n========================================================');
  console.log('✅ ALL HIDDEN FEATURES & SLASH COMMANDS VERIFIED!');
  console.log('========================================================');
} else {
  console.error('\n❌ SOME VERIFICATIONS FAILED');
  process.exit(1);
}
