import { WebSocket } from 'ws';

async function testLiveChat() {
  const meta = await (await fetch('http://127.0.0.1:5870/json')).json();
  const wsUrl = meta[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));

  const expr = `
    (async () => {
      const req = process.getBuiltinModule ? process.getBuiltinModule('module').createRequire(process.cwd()) : require;
      const vscode = req('vscode');
      
      const models = await vscode.lm.selectChatModels({ vendor: 'universal-ai' });
      const openRouterModel = models.find(m => m.id.includes('lfm-2.5-2.6b:free'));
      const groqModel = models.find(m => m.id.includes('gpt-oss-120b'));

      const testResults = [];

      for (const m of [openRouterModel, groqModel]) {
        if (!m) continue;
        try {
          const messages = [
            vscode.LanguageModelChatMessage.User('Hello from live workbench test! Respond with 1 word.')
          ];
          const response = await m.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
          let text = '';
          for await (const chunk of response.text) {
            text += chunk;
          }
          testResults.push({ model: m.id, success: true, text: text.trim().slice(0, 100) });
        } catch (e) {
          testResults.push({ model: m?.id, success: false, error: e.message });
        }
      }

      return testResults;
    })()
  `;

  ws.on('message', data => {
    const parsed = JSON.parse(data.toString());
    console.log('Live Workbench Chat Test Results:\n', JSON.stringify(parsed.result?.result?.value, null, 2));
    ws.close();
  });

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

testLiveChat().catch(console.error);
