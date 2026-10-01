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
      const req = process.mainModule?.require || process.getBuiltinModule?.('module')?.createRequire(process.cwd());
      const vscode = req('vscode');
      return vscode.extensions.all.map(e => ({ id: e.id, isActive: e.isActive, path: e.extensionUri?.path }));
    })()
  `);
  console.log('Extensions count:', res.result?.value?.length);
  const found = res.result?.value?.filter(e => e.id.toLowerCase().includes('universal') || e.id.toLowerCase().includes('ai'));
  console.log('Found:', JSON.stringify(found, null, 2));

  // Also print all extension IDs
  const allIds = res.result?.value?.map(e => e.id);
  console.log('Sample IDs:', allIds?.slice(0, 20));

  ws.close();
}
run().catch(console.error);
