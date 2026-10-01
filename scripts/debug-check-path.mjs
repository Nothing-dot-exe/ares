import { WebSocket } from 'ws';

async function run() {
  const meta = await (await fetch('http://127.0.0.1:5870/json')).json();
  const wsUrl = meta[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));

  function evaluate(expr) {
    return new Promise(resolve => {
      const id = 12345;
      ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) resolve(msg.result);
      });
      ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
    });
  }

  const res = await evaluate(`
    (() => {
      const fs = require('fs');
      try {
        const p = 'c:/Users/kadam/OneDrive/Documents/my hub/extensions/universal-ai';
        const exists = fs.existsSync(p);
        const pkgExists = fs.existsSync(p + '/package.json');
        const pkgContent = pkgExists ? JSON.parse(fs.readFileSync(p + '/package.json', 'utf8')) : null;
        return {
          exists,
          pkgExists,
          name: pkgContent?.name,
          publisher: pkgContent?.publisher,
          version: pkgContent?.version
        };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  console.log('Result from exthost:', res.result?.value);
  ws.close();
}
run().catch(console.error);
