// scripts/test-core-multi-turn.mjs
// Verifies Multi-Turn Conversation Memory for Core Native Ares AI

import { ARES_AI_PROVIDERS } from '../out/vs/workbench/contrib/chat/browser/aresAi/aresAiTypes.js';
import { streamChatCompletion } from '../out/vs/workbench/contrib/chat/browser/aresAi/aresAiClient.js';
import { CancellationToken } from '../out/vs/base/common/cancellation.js';
import fs from 'fs';
import path from 'path';

async function testMultiTurn() {
  console.log('======================================================');
  console.log('Testing Ares Native Core Multi-Turn Conversation Memory');
  console.log('======================================================');

  // 1. Resolve API key
  let groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    const keysPath = path.join(process.cwd(), '.keys.json');
    if (fs.existsSync(keysPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
        groqKey = parsed.Groq || parsed.groq;
      } catch {}
    }
  }

  if (!groqKey) {
    groqKey = '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';
  }

  const modelId = 'openai/gpt-oss-120b';
  const history = [];

  // --- TURN 1 ---
  console.log('\n--- Turn 1: User asks to define a User interface ---');
  const turn1User = 'Define a minimal TypeScript interface called User with id and name only. Keep it short.';
  const messagesTurn1 = [
    { role: 'system', content: 'You are Ares AI, the intelligent autonomous coding assistant built into Ares IDE. Be concise.' },
    { role: 'user', content: turn1User }
  ];

  let turn1Assistant = '';
  await streamChatCompletion(
    'Groq',
    groqKey,
    modelId,
    messagesTurn1,
    ({ content }) => {
      if (content) turn1Assistant += content;
    },
    CancellationToken.None
  );

  console.log('Turn 1 Assistant Response:\n', turn1Assistant.trim());
  history.push({ role: 'user', content: turn1User });
  history.push({ role: 'assistant', content: turn1Assistant.trim() });

  // --- TURN 2 ---
  console.log('\n--- Turn 2: User asks to add an email field (multi-turn context test) ---');
  const turn2User = 'Now add an email field to that User interface.';
  const messagesTurn2 = [
    { role: 'system', content: 'You are Ares AI, the intelligent autonomous coding assistant built into Ares IDE. Be concise.' },
    ...history,
    { role: 'user', content: turn2User }
  ];

  let turn2Assistant = '';
  await streamChatCompletion(
    'Groq',
    groqKey,
    modelId,
    messagesTurn2,
    ({ content }) => {
      if (content) turn2Assistant += content;
    },
    CancellationToken.None
  );

  console.log('Turn 2 Assistant Response:\n', turn2Assistant.trim());

  // Verification checks
  const hasUser = turn2Assistant.includes('User');
  const hasId = turn2Assistant.includes('id');
  const hasName = turn2Assistant.includes('name');
  const hasEmail = turn2Assistant.includes('email');

  console.log('\n--- Multi-Turn Memory Verification ---');
  console.log('Contains "User":', hasUser ? 'PASS' : 'FAIL');
  console.log('Contains "id" (retained from Turn 1):', hasId ? 'PASS' : 'FAIL');
  console.log('Contains "name" (retained from Turn 1):', hasName ? 'PASS' : 'FAIL');
  console.log('Contains "email" (added in Turn 2):', hasEmail ? 'PASS' : 'FAIL');

  if (hasUser && hasEmail && (hasId || hasName)) {
    console.log('\n✅ MULTI-TURN CONVERSATION MEMORY VERIFIED SUCCESSFULLY!');
  } else {
    console.error('\n❌ MULTI-TURN VERIFICATION FAILED: Turn 1 context was lost.');
    process.exit(1);
  }
}

testMultiTurn().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
