// scripts/inspect-exthost.mjs
async function run() {
  const meta = await (await fetch('http://127.0.0.1:5870/json')).json();
  const wsUrl = meta[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  function evaluate(expr) {
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
          returnByValue: true,
          awaitPromise: true
        }
      }));
    });
  }

  // Execute command in running extension host
  const res1 = await evaluate(`
    (async () => {
      try {
        const req = process.mainModule?.require || process.getBuiltinModule?.('module')?.createRequire(process.cwd());
        const vscode = req('vscode');
        
        await vscode.commands.executeCommand('universal-ai.useFreeKeys');

        return {
          success: true,
          message: 'universal-ai.useFreeKeys executed successfully!'
        };
      } catch (err) {
        return { error: err.stack || err.message };
      }
    })()
  `);
  console.log('Result:', JSON.stringify(res1, null, 2));

  ws.close();
}

run().catch(console.error);
