const http = require('http');

async function main() {
  const json = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:5870/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const ws = new WebSocket(json[0].webSocketDebuggerUrl);
  await new Promise(resolve => ws.onopen = resolve);

  function evalCode(expr) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: {
          expression: expr,
          returnByValue: true
        }
      }));
    });
  }

  const res = await evalCode(`
    (function() {
      try {
        const m = process.getBuiltinModule ? process.getBuiltinModule('module') : undefined;
        const cache = m._cache || {};
        return Object.keys(cache).filter(k => k.includes('vs'));
      } catch (e) {
        return { error: e.stack };
      }
    })()
  `);
  console.log('vs files in cache:', res.result.value);

  ws.close();
}

main().catch(console.error);
