import { WebSocket } from 'ws';

async function run() {
  const meta = await (await fetch('http://127.0.0.1:5870/json')).json();
  const wsUrl = meta[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));

  ws.on('message', data => {
    const parsed = JSON.parse(data.toString());
    console.log('Result:', JSON.stringify(parsed.result?.result?.value, null, 2));
    ws.close();
  });

  const expr = `
    (async () => {
      const req = process.getBuiltinModule ? process.getBuiltinModule('module').createRequire(process.cwd()) : require;
      const vscode = req('vscode');
      const ext = vscode.extensions.getExtension('vscode.universal-ai');
      
      const commands = await vscode.commands.getCommands();
      const aiCommands = commands.filter(c => c.startsWith('universal-ai'));

      let models = [];
      try {
        if (vscode.lm && vscode.lm.selectChatModels) {
          const selected = await vscode.lm.selectChatModels({ vendor: 'universal-ai' });
          models = selected.map(m => ({ id: m.id, name: m.name, vendor: m.vendor, family: m.family }));
        }
      } catch (e) {
        models = 'error: ' + e.message;
      }

      return {
        extension: {
          id: ext?.id,
          isActive: ext?.isActive,
          version: ext?.packageJSON?.version
        },
        aiCommands,
        models
      };
    })()
  `;

  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: expr,
      awaitPromise: true,
      returnByValue: true
    }
  }));
}

run().catch(console.error);
