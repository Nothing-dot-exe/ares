// scripts/verify-v4.mjs
// Verifies server endpoints, /api/test-key, and extension delivery

async function run() {
  console.log('Testing server health...');
  const root = await fetch('http://localhost:8080/');
  console.log('Root HTML status:', root.status);

  console.log('Testing /static/extensions/universal-ai-v5/package.json...');
  const pkgRes = await fetch('http://localhost:8080/static/extensions/universal-ai-v5/package.json');
  console.log('Package.json status:', pkgRes.status);
  const pkg = await pkgRes.json();
  console.log('Extension Version:', pkg.version);
  console.log('Registered Commands:', pkg.contributes?.commands?.map(c => c.command));
  console.log('Provider Enum:', pkg.contributes?.configuration?.properties?.['universalAi.provider']?.enum);

  console.log('Testing /static/extensions/universal-ai-v5/extension.js...');
  const extRes = await fetch('http://localhost:8080/static/extensions/universal-ai-v5/extension.js');
  console.log('Extension.js status:', extRes.status);
  const extText = await extRes.text();
  console.log('OmniRoute in extension.js:', extText.includes('OmniRoute'));

  console.log('Testing /api/test-key endpoint with Groq...');
  const groqTest = await fetch('http://localhost:8080/api/test-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'Groq' })
  });
  console.log('Groq test response status:', groqTest.status);
  const groqData = await groqTest.json();
  console.log('Groq test result:', groqData);

  console.log('Testing /api/test-key endpoint with OpenRouter...');
  const orTest = await fetch('http://localhost:8080/api/test-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'OpenRouter' })
  });
  console.log('OpenRouter test result:', await orTest.json());

  console.log('Testing /api/test-key endpoint with NVIDIA...');
  const nvTest = await fetch('http://localhost:8080/api/test-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'NVIDIA' })
  });
  console.log('NVIDIA test result:', await nvTest.json());

  console.log('Testing /api/test-key with invalid dummy key...');
  const fakeTest = await fetch('http://localhost:8080/api/test-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'Groq', apiKey: 'gsk_invalid_test_key_123' })
  });
  console.log('Fake key test result:', await fakeTest.json());
}

run().catch(console.error);
