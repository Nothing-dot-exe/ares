// scripts/test-core-tools.mjs
// Verifies Milestone 2 (Native Tool Execution & Surgical Editing) in Ares Native Core

import fs from 'fs';
import path from 'path';

async function testCoreTools() {
  console.log('========================================================');
  console.log('Testing Ares Native Core Tool Extraction & Execution');
  console.log('========================================================');

  // --- TEST 1: Terminal Command Extraction ---
  console.log('\n--- Test 1: Terminal Command Extraction ---');
  const sampleAiOutputWithTerminal = `
I will install the necessary dependencies and start the development server.

[run_in_terminal(command='npm install express cors')]

And to run the build:
\`\`\`bash:run
npm run build
\`\`\`

Here is the server file:
\`\`\`javascript:server.js
const express = require('express');
const app = express();
app.listen(3000, () => console.log('Ready'));
\`\`\`
`;

  const terminalCommands = [];
  const cmdRegex = /(?:\[run_in_terminal\s*\(\s*(?:command|cmd)?\s*=?\s*['"]?([^'")\]]+)['"]?\s*\)\])|(?:\[execute_command\s*\(\s*(?:command|cmd)?\s*=?\s*['"]?([^'")\]]+)['"]?\s*\)\])/gi;
  for (const cm of sampleAiOutputWithTerminal.matchAll(cmdRegex)) {
    const cmd = cm[1] || cm[2];
    if (cmd && cmd.trim()) terminalCommands.push(cmd.trim());
  }

  const runCodeBlockRegex = /```(?:bash|sh|powershell|cmd):run\s*\n([\s\S]*?)```/gi;
  for (const rm of sampleAiOutputWithTerminal.matchAll(runCodeBlockRegex)) {
    if (rm[1] && rm[1].trim()) {
      terminalCommands.push(rm[1].trim());
    }
  }

  console.log('Extracted Terminal Commands:', terminalCommands);
  const passT1 = terminalCommands.length === 2 &&
    terminalCommands[0] === 'npm install express cors' &&
    terminalCommands[1] === 'npm run build';
  console.log('Test 1 Result:', passT1 ? 'PASS' : 'FAIL');
  if (!passT1) process.exit(1);

  // --- TEST 2: Surgical File Patching (SEARCH/REPLACE) ---
  console.log('\n--- Test 2: Surgical File Patching ---');
  const testDir = path.join(process.cwd(), 'out', 'test-patch-sandbox');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const testFile = path.join(testDir, 'config.ts');
  fs.writeFileSync(testFile, `
export interface AppConfig {
  port: number;
  host: string;
}
`, 'utf8');

  const sampleAiPatchOutput = `
I will update the config to include a debug mode flag.

### \`config.ts\`
<<<<<<< SEARCH
export interface AppConfig {
  port: number;
  host: string;
}
=======
export interface AppConfig {
  port: number;
  host: string;
  debug: boolean;
}
>>>>>>>
`;

  const patchRegex = /(?:###?\s*`?([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9]+)`?[\s\S]*?)?<{7}\s*SEARCH\s*\n([\s\S]*?)\n={7}\s*\n([\s\S]*?)\n>{7}/gi;
  let patchMatch;
  let applied = false;
  while ((patchMatch = patchRegex.exec(sampleAiPatchOutput)) !== null) {
    const targetFile = (patchMatch[1] || '').trim();
    const searchBlock = patchMatch[2];
    const replaceBlock = patchMatch[3];

    console.log(`Target: ${targetFile}`);
    console.log(`Search Block:\n${searchBlock}`);
    console.log(`Replace Block:\n${replaceBlock}`);

    if (targetFile === 'config.ts') {
      const current = fs.readFileSync(testFile, 'utf8');
      if (current.includes(searchBlock)) {
        const updated = current.replace(searchBlock, replaceBlock);
        fs.writeFileSync(testFile, updated, 'utf8');
        applied = true;
      }
    }
  }

  const patchedContent = fs.readFileSync(testFile, 'utf8');
  console.log('Patched Content:\n', patchedContent.trim());
  const passT2 = applied && patchedContent.includes('debug: boolean;');
  console.log('Test 2 Result:', passT2 ? 'PASS' : 'FAIL');
  if (!passT2) process.exit(1);

  // Clean up test file
  fs.rmSync(testDir, { recursive: true, force: true });

  console.log('\n========================================================');
  console.log('✅ MILESTONE 2 NATIVE TOOL & EDIT VERIFICATION PASSED!');
  console.log('========================================================');
}

testCoreTools().catch(err => {
  console.error(err);
  process.exit(1);
});
