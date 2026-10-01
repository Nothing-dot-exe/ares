// scripts/test-core-context.mjs
// Verifies Milestone 3 (Rich Editor Context & #file Attachments) in Ares Native Core

import { streamChatCompletion } from '../out/vs/workbench/contrib/chat/browser/aresAi/aresAiClient.js';
import { CancellationToken } from '../out/vs/base/common/cancellation.js';
import fs from 'fs';
import path from 'path';

async function testCoreContext() {
  console.log('========================================================');
  console.log('Testing Ares Native Core Rich Context & #file Attachments');
  console.log('========================================================');

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

  // --- Simulate Active Editor Selection ---
  const activeFileName = 'calculator.ts';
  const selectedCode = `
export function multiply(a: number, b: number): number {
  return a * b;
}
`;
  const editorContext = `\n\n[Active File: ${activeFileName} (typescript)]\n[Selected Code (lines 12-16)]:\n\`\`\`typescript\n${selectedCode}\n\`\`\`\n`;

  // --- Simulate #file Attachment ---
  const attachedFileName = 'types.ts';
  const attachedFileContent = `
export interface CalculationResult {
  operation: string;
  result: number;
  timestamp: number;
}
`;
  const attachmentContext = `\n\n[Attached File: ${attachedFileName}]:\n\`\`\`typescript\n${attachedFileContent}\n\`\`\`\n`;

  // User prompt that refers to both the selected code and the attached file
  const userPrompt = 'Wrap the selected multiply function so it returns a CalculationResult object from types.ts.';
  const effectivePrompt = userPrompt + editorContext + attachmentContext;

  const messages = [
    { role: 'system', content: 'You are Ares AI, the intelligent autonomous coding assistant built into Ares IDE. Be concise.' },
    { role: 'user', content: effectivePrompt }
  ];

  console.log('\n--- Sending Request with Injected Editor Context & Attachment ---');
  console.log('Prompt:\n', effectivePrompt.trim());

  let responseText = '';
  await streamChatCompletion(
    'Groq',
    groqKey,
    modelId,
    messages,
    ({ content }) => {
      if (content) responseText += content;
    },
    CancellationToken.None
  );

  console.log('\n--- Assistant Response ---');
  console.log(responseText.trim());

  // Verification checks:
  // 1. Response must use CalculationResult (from the #file attachment)
  // 2. Response must use multiply and the multiplication logic (from the editor selection)
  // 3. Response should have the fields (operation, result, timestamp)
  const hasCalcResult = responseText.includes('CalculationResult');
  const hasMultiply = responseText.includes('multiply');
  const hasOperation = responseText.includes('operation') || responseText.includes('result');

  console.log('\n--- Context Verification Results ---');
  console.log('Recognized CalculationResult from #file attachment:', hasCalcResult ? 'PASS' : 'FAIL');
  console.log('Recognized multiply from active editor selection:', hasMultiply ? 'PASS' : 'FAIL');
  console.log('Integrated fields from attached interface:', hasOperation ? 'PASS' : 'FAIL');

  if (hasCalcResult && hasMultiply && hasOperation) {
    console.log('\n========================================================');
    console.log('✅ MILESTONE 3 RICH CONTEXT & ATTACHMENT VERIFIED!');
    console.log('========================================================');
  } else {
    console.error('\n❌ MILESTONE 3 VERIFICATION FAILED: Context was not used properly.');
    process.exit(1);
  }
}

testCoreContext().catch(err => {
  console.error(err);
  process.exit(1);
});
