import { WebSocket } from 'ws';

async function testSendChat() {
  const tabs = await (await fetch('http://127.0.0.1:50721/json')).json();
  const page = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let msgId = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.off('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Listen to all console output
  ws.on('message', data => {
    const msg = JSON.parse(data.toString());
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description).join(' ');
      console.log(`[CONSOLE ${msg.params.type}]`, text);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.log('[EXCEPTION]', JSON.stringify(msg.params.exceptionDetails));
    }
  });

  await send('Console.enable');
  await send('Runtime.enable');

  // Focus input and paste 'Hello'
  const pasteRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const inputContainer = document.querySelector('.interactive-input-part');
        if (!inputContainer) return { error: 'No input container' };
        
        // Find input editor
        const editorDom = inputContainer.querySelector('.monaco-editor');
        if (!editorDom) return { error: 'No monaco-editor' };

        // Dispatch paste event into editor
        const dt = new DataTransfer();
        dt.setData('text/plain', 'Hello from Ares test');
        const pasteEvt = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        });
        
        const target = editorDom.querySelector('.native-edit-context') || editorDom.querySelector('textarea') || editorDom;
        target.dispatchEvent(pasteEvt);

        return { dispatched: true };
      })()
    `,
    returnByValue: true
  });
  console.log('Paste result:', pasteRes.result.value);

  await new Promise(r => setTimeout(r, 500));

  // Press Enter
  const keyRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const inputContainer = document.querySelector('.interactive-input-part');
        const editorDom = inputContainer.querySelector('.monaco-editor');
        const target = editorDom.querySelector('.native-edit-context') || editorDom.querySelector('textarea') || editorDom;
        
        // Dispatch enter keydown
        const enterEvt = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        target.dispatchEvent(enterEvt);
        return { enterSent: true };
      })()
    `,
    returnByValue: true
  });
  console.log('Key result:', keyRes.result.value);

  // Wait 3 seconds to see what happens
  await new Promise(r => setTimeout(r, 3000));

  // Check state
  const afterState = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const list = document.querySelector('.interactive-list');
        const items = document.querySelectorAll('.chat-item, .interactive-item-container');
        const progress = document.querySelectorAll('.chat-progress-message, .chat-response');
        return {
          listVisible: list ? window.getComputedStyle(list).display !== 'none' : false,
          listHeight: list ? list.offsetHeight : 0,
          itemsCount: items.length,
          progressCount: progress.length,
          itemsText: Array.from(items).map(i => i.innerText.slice(0, 100))
        };
      })()
    `,
    returnByValue: true
  });
  console.log('After send state:', JSON.stringify(afterState.result.value, null, 2));

  ws.close();
}

testSendChat().catch(console.error);
