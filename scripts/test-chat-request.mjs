import { WebSocket } from 'ws';

async function run() {
  const meta = await (await fetch('http://127.0.0.1:5870/json')).json();
  const wsUrl = meta[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));

  ws.on('message', data => {
    const parsed = JSON.parse(data.toString());
    console.log('Chat Request Test Result:\n', JSON.stringify(parsed.result?.result?.value, null, 2));
    ws.close();
  });

  const expr = `
    (async () => {
      const req = process.getBuiltinModule ? process.getBuiltinModule('module').createRequire(process.cwd()) : require;
      const vscode = req('vscode');
      const models = await vscode.lm.selectChatModels({ vendor: 'universal-ai' });
      if (!models || models.length === 0) return { error: 'No models found' };
      
      const model = models[0];
      const messages = [
        vscode.LanguageModelChatMessage.User('Hello! Confirm you are working in Code OSS desktop mode in one short sentence.')
      ];

      const cts = new vscode.CancellationTokenSource();
      const response = await model.sendRequest(messages, {}, cts.token);
      let text = '';
      for await (const chunk of response.text) {
        text += chunk;
      }

      return {
        modelId: model.id,
        modelName: model.name,
        responseText: text.trim()
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
