// Test script simulating the Ares AI ReAct Multi-Step Autonomous Agent Loop
import assert from 'assert';

console.log('Testing Ares AI ReAct Multi-Step Loop Simulation...');

// Mock tools
const mockTools = {
	run_command: async (args) => {
		if (args.command.includes('git status')) {
			return 'On branch main\nYour branch is up to date with origin/main.\nChanges not staged for commit:\n  modified: src/app.ts';
		}
		if (args.command.includes('npm test')) {
			return 'PASS src/app.test.ts (5 tests passed)';
		}
		return `Executed: ${args.command}`;
	},
	read_file: async (args) => {
		return `File: ${args.path} (3 lines):\n1: function add(a, b) {\n2:   return a + b;\n3: }`;
	}
};

// Simulated ReAct loop
async function runReActSimulation(userPrompt) {
	const messages = [
		{ role: 'system', content: 'You are Ares AI with autonomous tools.' },
		{ role: 'user', content: userPrompt }
	];

	const steps = [];
	let stepCount = 0;
	const MAX_STEPS = 5;

	// Mock language model turns
	const mockModelResponses = [
		// Turn 1: Model calls run_command
		`<tool_call>\n{"name": "run_command", "arguments": {"command": "git status"}}\n</tool_call>`,
		// Turn 2: Model receives output, now calls read_file
		`I see src/app.ts is modified. Let me inspect it:\n<tool_call>\n{"name": "read_file", "arguments": {"path": "src/app.ts"}}\n</tool_call>`,
		// Turn 3: Model receives file content, runs test
		`The function looks good. Let me run the test suite to verify:\n<tool_call>\n{"name": "run_command", "arguments": {"command": "npm test"}}\n</tool_call>`,
		// Turn 4: Final response
		`All 5 tests passed cleanly! Git status and src/app.ts have been verified.`
	];

	function extractToolCalls(text) {
		const calls = [];
		const xmlRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
		let m;
		while ((m = xmlRegex.exec(text)) !== null) {
			try {
				const p = JSON.parse(m[1].trim());
				if (p.name) calls.push(p);
			} catch {}
		}
		return calls;
	}

	while (stepCount < MAX_STEPS) {
		const assistantResponse = mockModelResponses[stepCount] || 'Done';
		steps.push({ step: stepCount + 1, response: assistantResponse });

		const toolCalls = extractToolCalls(assistantResponse);
		if (toolCalls.length === 0) {
			break;
		}

		messages.push({ role: 'assistant', content: assistantResponse });

		for (const call of toolCalls) {
			const toolFn = mockTools[call.name];
			assert.ok(toolFn, `Tool ${call.name} exists`);
			const toolResult = await toolFn(call.arguments);
			messages.push({
				role: 'user',
				content: `[Tool Result for ${call.name}]:\n${toolResult}`
			});
		}

		stepCount++;
	}

	return { steps, messages };
}

const { steps, messages } = await runReActSimulation('Inspect repository status, read app.ts, and test it');

assert.strictEqual(steps.length, 4);
assert.ok(messages.some(m => m.content.includes('[Tool Result for run_command]')));
assert.ok(messages.some(m => m.content.includes('[Tool Result for read_file]')));
assert.ok(steps[steps.length - 1].response.includes('All 5 tests passed'));

console.log('✅ ReAct multi-step autonomous simulation completed successfully in 4 steps!');
