import { WebSocket } from 'ws';

async function run() {
  const meta = await (await fetch('http://127.0.0.1:5870/json')).json();
  const wsUrl = meta[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));

  ws.on('message', data => {
    console.log('Result:', JSON.stringify(JSON.parse(data.toString()), null, 2));
    ws.close();
  });

  const expr = `
    (() => {
      try {
        const fs = process.getBuiltinModule('fs');
        const extDir = 'c:/Users/kadam/OneDrive/Documents/my hub/extensions/universal-ai';
        return {
          dirExists: fs.existsSync(extDir),
          files: fs.readdirSync(extDir),
          pkg: JSON.parse(fs.readFileSync(extDir + '/package.json', 'utf8'))
        };
      } catch (e) {
        return { error: e.message, stack: e.stack };
      }
    })()
  `;

  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression: expr, returnByValue: true }
  }));
}

run().catch(console.error);
