// scripts/verify-v3.mjs
import http from 'http';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

async function run() {
  const pkgRes = await get('http://localhost:8080/static/extensions/universal-ai-v3/package.json');
  console.log('package.json status:', pkgRes.status, 'version:', JSON.parse(pkgRes.data).version);

  const jsRes = await get('http://localhost:8080/static/extensions/universal-ai-v3/extension.js');
  console.log('extension.js status:', jsRes.status, 'cache-control:', jsRes.headers['cache-control']);
  console.log('Has update("provider"):', jsRes.data.includes("update('provider'"));
  console.log('Has update("universalAi.provider"):', jsRes.data.includes("update('universalAi.provider'"));
  console.log('Has activeProviderName:', jsRes.data.includes('activeProviderName'));

  const indexRes = await get('http://localhost:8080/?ew=true');
  console.log('index status:', indexRes.status);
  console.log('Has universal-ai-v3:', indexRes.data.includes('/static/extensions/universal-ai-v3'));
  console.log('Has clean_ai_wipe_v8:', indexRes.data.includes('clean_ai_wipe_v8'));
}

run().catch(console.error);
