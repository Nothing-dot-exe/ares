import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const keysFile = path.join(rootDir, '.keys.json');

let keys = {};
if (fs.existsSync(keysFile)) {
  keys = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
}

const PROVIDERS = [
  {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    key: keys.Groq,
    models: [
      'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b'
    ]
  },
  {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    key: keys.OpenRouter,
    models: [
      'liquid/lfm-2.5-2.6b:free',
      'nvidia/nemotron-3.5-lightning:free'
    ]
  },
  {
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    key: keys.NVIDIA,
    models: [
      'meta/llama-3.2-11b-vision-instruct'
    ]
  }
];

async function testStreamingChat(providerName, baseUrl, key, modelId, prompt) {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`
  };

  const payload = {
    model: modelId,
    messages: [
      { role: 'system', content: 'You are an AI assistant in Ares IDE.' },
      { role: 'user', content: prompt }
    ],
    stream: true,
    max_tokens: 100
  };

  const startTime = Date.now();
  let firstTokenTime = 0;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!res.ok) {
      clearTimeout(timeoutId);
      const errText = await res.text();
      return { ok: false, latency: Date.now() - startTime, error: `HTTP ${res.status}: ${errText.slice(0, 150)}` };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') break;
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta;
            const content = delta?.content || delta?.reasoning || delta?.reasoning_content || '';
            if (content) {
              if (!firstTokenTime) {
                firstTokenTime = Date.now() - startTime;
              }
              fullText += content;
              chunkCount++;
            }
          } catch {}
        }
      }
    }

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    return {
      ok: true,
      latency,
      ttft: firstTokenTime || latency,
      chunks: chunkCount,
      text: fullText.trim()
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    return { ok: false, latency, error: err.name === 'AbortError' ? 'Timed out' : err.message };
  }
}

async function runLoop(iterations = 3) {
  console.log('='.repeat(75));
  console.log(`⚡ Ares IDE AI Chat Test: Streaming Multi-Turn Loop (${iterations} Iterations)`);
  console.log('='.repeat(75));

  const allResults = [];
  const testPrompts = [
    'Confirm your name and model in one concise sentence.',
    'Write a one-line JavaScript function to reverse a string.',
    'What is the time complexity of binary search? Answer in 5 words.'
  ];

  for (let iter = 1; iter <= iterations; iter++) {
    const prompt = testPrompts[(iter - 1) % testPrompts.length];
    console.log(`\n================== LOOP ITERATION ${iter} / ${iterations} ==================`);
    console.log(`Prompt: "${prompt}"\n`);

    for (const provider of PROVIDERS) {
      console.log(`[Provider: ${provider.name}]`);

      for (const model of provider.models) {
        process.stdout.write(`  Model [${model}] -> `);
        const result = await testStreamingChat(provider.name, provider.baseUrl, provider.key, model, prompt);

        if (result.ok) {
          console.log(`PASS! (Total: ${result.latency}ms, TTFT: ${result.ttft}ms, Chunks: ${result.chunks})`);
          const preview = result.text.replace(/\r?\n/g, ' ').slice(0, 100);
          console.log(`    Response: "${preview}${result.text.length > 100 ? '...' : ''}"`);
        } else {
          console.log(`FAIL! (${result.latency}ms) -> ${result.error}`);
        }

        allResults.push({ iter, provider: provider.name, model, prompt, ...result });
      }
    }
  }

  console.log('\n' + '='.repeat(75));
  console.log('FINAL CHAT LOOP TEST REPORT:');
  const total = allResults.length;
  const passed = allResults.filter(r => r.ok).length;
  const failed = total - passed;
  console.log(`Total Prompts Streamed: ${total}`);
  console.log(`Success: ${passed} / ${total} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`Failures: ${failed}`);
  console.log('='.repeat(75));

  if (failed > 0) {
    console.log('Failed tests:');
    allResults.filter(r => !r.ok).forEach(f => {
      console.log(`- Loop ${f.iter} | ${f.provider} | ${f.model}: ${f.error}`);
    });
  }

  return { total, passed, failed };
}

const iters = parseInt(process.argv[2] || '3', 10);
runLoop(iters).then(summary => {
  if (summary.failed === 0) {
    console.log('\n🎉 ALL CHAT STREAMS IN THE LOOP PASSED 100% SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}).catch(err => {
  console.error('Fatal crash during chat test:', err);
  process.exit(1);
});
