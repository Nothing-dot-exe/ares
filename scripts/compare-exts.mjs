import * as fs from 'fs';
import * as path from 'path';

const meta = await (await fetch('http://127.0.0.1:5870/json')).json();
const wsUrl = meta[0].webSocketDebuggerUrl;
const ws = new WebSocket(wsUrl);
await new Promise(r => ws.onopen = r);

const extsInHost = await new Promise(resolve => {
  ws.onmessage = e => {
    const data = JSON.parse(e.data);
    resolve(data.result?.result?.value || []);
  };
  const expr = `
    (() => {
      const req = process.getBuiltinModule ? process.getBuiltinModule('module').createRequire(process.cwd()) : require;
      const vscode = req('vscode');
      return vscode.extensions.all.map(e => e.id);
    })()
  `;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
});
ws.close();

console.log('Host has', extsInHost.length, 'extensions');

const extDir = path.resolve('extensions');
const folders = fs.readdirSync(extDir);

const missing = [];
for (const folder of folders) {
  const pkgPath = path.join(extDir, folder, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const id = ((pkg.publisher || 'vscode') + '.' + pkg.name).toLowerCase();
      if (!extsInHost.map(x => x.toLowerCase()).includes(id)) {
        missing.push({ folder, id, main: pkg.main, browser: pkg.browser });
      }
    } catch (e) {}
  }
}

console.log('Folders in extensions/ missing from host:', missing);
