import { WebSocket } from 'ws';

async function run() {
  const meta = await (await fetch('http://127.0.0.1:5870/json')).json();
  const wsUrl = meta[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));

  ws.on('message', data => {
    const parsed = JSON.parse(data.toString());
    const val = parsed.result?.result?.value;
    if (val) {
      console.log('Total extensions in exthost:', val.length);
      console.log('Extensions:', JSON.stringify(val, null, 2));
    } else {
      console.log('Error/Result:', JSON.stringify(parsed, null, 2));
    }
    ws.close();
  });

  const expr = `
    (() => {
      const req = process.getBuiltinModule ? process.getBuiltinModule('module').createRequire(process.cwd()) : require;
      const vscode = req('vscode');
      return vscode.extensions.all.map(e => e.id);
    })()
  `;

  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: expr,
      returnByValue: true
    }
  }));
}

run().catch(console.error);
