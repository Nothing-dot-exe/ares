// Test script for Ares AI Autonomous Tool Call Extraction (including Internet Tools)
import assert from 'assert';

console.log('Testing Ares AI Tool Call Extractor (with Internet Tools)...');

function extractToolCalls(text) {
	const toolCalls = [];

	// 1. XML style: <tool_call> ... </tool_call>
	const xmlRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
	let xmlMatch;
	while ((xmlMatch = xmlRegex.exec(text)) !== null) {
		const raw = xmlMatch[1].trim();
		try {
			const parsed = JSON.parse(raw);
			if (parsed.name) {
				toolCalls.push({ name: parsed.name, args: parsed.arguments || parsed.args || {} });
				continue;
			}
		} catch {}

		const nameMatch = raw.match(/<name>(.*?)<\/name>/i);
		const argsMatch = raw.match(/<arguments>([\s\S]*?)<\/arguments>/i);
		if (nameMatch) {
			let parsedArgs = {};
			if (argsMatch) {
				try { parsedArgs = JSON.parse(argsMatch[1]); } catch {}
			}
			toolCalls.push({ name: nameMatch[1].trim(), args: parsedArgs });
		}
	}

	// 2. Markdown tool block: ```tool:name ... ```
	const toolBlockRegex = /```tool:([a-zA-Z0-9_\-]+)\s*\n([\s\S]*?)```/gi;
	let tbMatch;
	while ((tbMatch = toolBlockRegex.exec(text)) !== null) {
		const name = tbMatch[1].trim();
		let args = {};
		try { args = JSON.parse(tbMatch[2].trim()); } catch {}
		toolCalls.push({ name, args });
	}

	// 3. Bracket format: [run_command(command="...")] or [web_search(query="...")]
	const bracketRegex = /\[(run_command|run_in_terminal|execute_command|read_file|write_file|edit_file|list_dir|grep_search|web_search|search_web|fetch_web_page|read_url|fetch_page)\s*\(\s*(?:command|cmd|path|query|url)?\s*=?\s*['"]?([^'")\]]+)['"]?\s*\)\]/gi;
	let brMatch;
	while ((brMatch = bracketRegex.exec(text)) !== null) {
		const name = brMatch[1];
		const val = brMatch[2];
		const argKey = (name.includes('command') || name.includes('terminal'))
			? 'command'
			: (name.includes('file') || name.includes('dir'))
			? 'path'
			: (name.includes('search') || name.includes('query'))
			? 'query'
			: 'url';
		toolCalls.push({ name, args: { [argKey]: val } });
	}

	// 4. Executable script block: ```bash:run ... ```
	const runCodeBlockRegex = /```(?:bash|sh|powershell|cmd):run\s*\n([\s\S]*?)```/gi;
	let rcbMatch;
	while ((rcbMatch = runCodeBlockRegex.exec(text)) !== null) {
		if (rcbMatch[1] && rcbMatch[1].trim()) {
			toolCalls.push({ name: 'run_command', args: { command: rcbMatch[1].trim() } });
		}
	}

	return toolCalls;
}

// Test Case 1: XML JSON tool call (run_command)
const res1 = extractToolCalls(`<tool_call>{"name": "run_command", "arguments": {"command": "git status"}}</tool_call>`);
assert.strictEqual(res1.length, 1);
assert.strictEqual(res1[0].name, 'run_command');
assert.strictEqual(res1[0].args.command, 'git status');

// Test Case 2: XML sub-tag format (read_file)
const res2 = extractToolCalls(`<tool_call><name>read_file</name><arguments>{"path": "package.json", "startLine": 1, "endLine": 30}</arguments></tool_call>`);
assert.strictEqual(res2.length, 1);
assert.strictEqual(res2[0].name, 'read_file');
assert.strictEqual(res2[0].args.path, 'package.json');

// Test Case 3: Live Web Search (web_search)
const res3 = extractToolCalls(`<tool_call>{"name": "web_search", "arguments": {"query": "Next.js 15 server actions tutorial"}}</tool_call>`);
assert.strictEqual(res3.length, 1);
assert.strictEqual(res3[0].name, 'web_search');
assert.strictEqual(res3[0].args.query, 'Next.js 15 server actions tutorial');

// Test Case 4: Live Web Page Fetcher (fetch_web_page)
const res4 = extractToolCalls(`[fetch_web_page(url="https://nodejs.org/api/fs.html")]`);
assert.strictEqual(res4.length, 1);
assert.strictEqual(res4[0].name, 'fetch_web_page');
assert.strictEqual(res4[0].args.url, 'https://nodejs.org/api/fs.html');

// Test Case 5: Bracket Web Search
const res5 = extractToolCalls(`[web_search(query="electron desktop titlebar styles")]`);
assert.strictEqual(res5.length, 1);
assert.strictEqual(res5[0].name, 'web_search');
assert.strictEqual(res5[0].args.query, 'electron desktop titlebar styles');

// Test Case 6: Markdown tool block
const res6 = extractToolCalls('```tool:list_dir\n{"path": "src"}\n```');
assert.strictEqual(res6.length, 1);
assert.strictEqual(res6[0].name, 'list_dir');

console.log('✅ All 6 tool call tests including Internet tools passed successfully!');
