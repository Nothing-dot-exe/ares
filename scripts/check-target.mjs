import { WebSocket } from 'ws';

async function run() {
  const meta = await (await fetch('http://127.0.0.1:5870/json')).json();
  console.log('Targets:', meta.map(t => ({ id: t.id, title: t.title, type: t.type })));
  const wsUrl = meta[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));

  ws.on('message', data => {
    console.log('Result:', JSON.stringify(JSON.parse(data.toString()), null, 2));
    ws.close();
  });

  // Check global variables or process in the utility process
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: 'process.argv',
      returnByValue: true
    }
  }));
}

run().catch(console.error);
