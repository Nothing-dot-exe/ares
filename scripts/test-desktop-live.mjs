import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import { WebSocket } from 'ws';

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const electronExe = path.resolve('.build/electron/Code - OSS.exe');
  console.log('[*] Spawning Electron directly:', electronExe);

  const env = {
    ...process.env,
    NODE_ENV: 'development',
    VSCODE_DEV: '1',
    VSCODE_CLI: '1',
    ELECTRON_ENABLE_LOGGING: '1',
    VSCODE_SKIP_PRELAUNCH: '1'
  };

  const proc = spawn(electronExe, [
    '.',
    '--remote-debugging-port=5870',
    '--disable-workspace-trust'
  ], {
    cwd: process.cwd(),
    env,
    stdio: 'ignore'
  });

  console.log('[*] Electron PID:', proc.pid);

  // Poll for CDP
  console.log('[*] Waiting for CDP endpoint on 127.0.0.1:5870...');
  let targets = [];
  const start = Date.now();
  while (Date.now() - start < 30000) {
    try {
      targets = await getJson('http://127.0.0.1:5870/json');
      if (Array.isArray(targets) && targets.length > 0) {
        const page = targets.find(t => t.type === 'page' || (t.url && t.url.includes('workbench')));
        if (page) {
          break;
        }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }

  const page = targets.find(t => t.type === 'page' || (t.url && t.url.includes('workbench'))) || targets[0];
  if (!page || !page.webSocketDebuggerUrl) {
    console.error('[!] Failed to acquire CDP target!');
    proc.kill();
    process.exit(1);
  }

  console.log('[*] Connecting to WebSocket:', page.webSocketDebuggerUrl);
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

  console.log('[*] Waiting 5s for workbench to stabilize...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('[*] Triggering workbench.action.chat.open via command service...');
  await send('Runtime.evaluate', {
    expression: `
      (async () => {
        // Find command service or trigger chat open command
        if (window.vscode && window.vscode.commands) {
          await window.vscode.commands.executeCommand('workbench.action.chat.open');
        } else {
          // Click chat icon in titlebar or activity bar
          const chatIcon = document.querySelector('.action-item [aria-label*="Chat"], .action-item a[aria-label*="Chat"], a.action-label.codicon-comment-discussion');
          if (chatIcon) {
            chatIcon.click();
          }
        }
      })()
    `,
    awaitPromise: true
  });

  console.log('[*] Waiting 3s for chat view pane to mount...');
  await new Promise(r => setTimeout(r, 3000));

  const result = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const chatView = document.querySelector('.chat-view-pane, [id="workbench.panel.chat"], [id="workbench.view.chat"]');
        const controlsWrapper = document.querySelector('.controls-wrapper');
        const sessionsEl = document.querySelector('.agent-sessions-container');
        const interactiveSession = document.querySelector('.interactive-session');
        const welcomeView = document.querySelector('.chat-welcome-view-container');
        const interactiveList = document.querySelector('.interactive-list');
        const inputPartEl = document.querySelector('.interactive-input-part');
        const editorEl = inputPartEl ? inputPartEl.querySelector('.monaco-editor') : null;
        const textarea = inputPartEl ? inputPartEl.querySelector('textarea, .native-edit-context') : null;
        const modelPicker = document.querySelector('.chat-model-picker, .chat-input-picker, .action-item.model-picker');

        // All panels / aux bar state
        const auxBar = document.querySelector('.part.auxiliarybar');

        return {
          auxBar: auxBar ? {
            width: auxBar.offsetWidth,
            height: auxBar.offsetHeight,
            visible: auxBar.style.display !== 'none'
          } : null,
          chatView: chatView ? {
            width: chatView.offsetWidth,
            height: chatView.offsetHeight
          } : null,
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

  console.log('=== CHAT PANEL INSPECTION RESULT ===');
  console.log(JSON.stringify(result.result.value, null, 2));

  ws.close();
  try {
    process.kill(proc.pid);
  } catch {}
  console.log('[*] Done.');
  process.exit(0);
}

main().catch(err => {
  console.error('[!] Error:', err);
  process.exit(1);
});
