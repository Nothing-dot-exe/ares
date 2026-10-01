import { WebSocket } from 'ws';

async function getPageTab(port, maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      if (res.ok) {
        const tabs = await res.json();
        const page = tabs.find(t => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          return page;
        }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for page tab on port ${port}`);
}

async function inspectChatPanel() {
  const port = process.argv[2] || '58894';
  const page = await getPageTab(port);
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

  // Wait an extra 2s for DOM rendering
  await new Promise(r => setTimeout(r, 2000));

  const dump = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const chatView = document.querySelector('.chat-view-pane, [id="workbench.panel.chat"]');
        const controlsWrapper = document.querySelector('.controls-wrapper');
        const sessionsEl = document.querySelector('.agent-sessions-container');
        const interactiveSession = document.querySelector('.interactive-session');
        const welcomeView = document.querySelector('.chat-welcome-view-container');
        const interactiveList = document.querySelector('.interactive-list');
        const inputPartEl = document.querySelector('.interactive-input-part');
        const editorEl = inputPartEl ? inputPartEl.querySelector('.monaco-editor') : null;
        const textarea = inputPartEl ? inputPartEl.querySelector('textarea, .native-edit-context') : null;
        const modelPicker = document.querySelector('.chat-model-picker, .chat-input-picker, .action-item.model-picker');

        return {
          controlsWrapper: controlsWrapper ? {
            height: controlsWrapper.offsetHeight,
            width: controlsWrapper.offsetWidth
          } : null,
          sessionsContainer: sessionsEl ? {
            visible: sessionsEl.style.display !== 'none' && sessionsEl.offsetHeight > 0,
            offsetHeight: sessionsEl.offsetHeight,
            display: sessionsEl.style.display,
            innerText: sessionsEl.innerText.slice(0, 100)
          } : null,
          interactiveSession: interactiveSession ? {
            offsetHeight: interactiveSession.offsetHeight,
            offsetWidth: interactiveSession.offsetWidth,
            style: interactiveSession.getAttribute('style')
          } : null,
          welcomeView: welcomeView ? {
            offsetHeight: welcomeView.offsetHeight,
            display: welcomeView.style.display,
            innerText: welcomeView.innerText.slice(0, 200)
          } : null,
          interactiveList: interactiveList ? {
            offsetHeight: interactiveList.offsetHeight,
            display: interactiveList.style.display
          } : null,
          inputPart: inputPartEl ? {
            offsetHeight: inputPartEl.offsetHeight,
            hasEditor: !!editorEl,
            editorHeight: editorEl ? editorEl.offsetHeight : 0,
            hasTextarea: !!textarea,
            innerText: inputPartEl.innerText.replace(/\\n+/g, ' ').slice(0, 200)
          } : null,
          modelPicker: modelPicker ? {
            innerText: modelPicker.innerText,
            ariaLabel: modelPicker.getAttribute('aria-label')
          } : null
        };
      })()
    `,
    returnByValue: true
  });

  console.log(JSON.stringify(dump.result.value, null, 2));
  ws.close();
}

inspectChatPanel().catch(console.error);
