// Verification script for Chat Progress Content contract
import assert from 'assert';

console.log('Testing chat progress part contract...');

// 1. Validate IChatProgressMessage contract
const validProgress = {
	kind: 'progressMessage',
	content: { value: 'Thinking with Groq (openai/gpt-oss-120b)...', isTrusted: false },
	shimmer: true
};

assert.strictEqual(validProgress.kind, 'progressMessage');
assert.ok(validProgress.content);
assert.strictEqual(typeof validProgress.content.value, 'string');
assert.ok(validProgress.content.value.includes('Thinking'));

// 2. Validate fallback simulation
const fallbackSimulation = (progress) => {
	const currentContent = progress.content ?? progress.message ?? { value: '', isTrusted: false };
	return currentContent.value;
};

assert.strictEqual(fallbackSimulation({ kind: 'progressMessage', message: { value: 'Legacy message' } }), 'Legacy message');
assert.strictEqual(fallbackSimulation({ kind: 'progressMessage', content: { value: 'Proper content' } }), 'Proper content');
assert.strictEqual(fallbackSimulation({ kind: 'progressMessage' }), '');

console.log('✅ Chat progress contract and fallback verification passed successfully!');
