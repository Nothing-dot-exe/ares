import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const userDir = path.join(process.env.APPDATA, 'code-oss-dev', 'User');
function scanDir(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) scanDir(full);
    else if (f.name.endsWith('.vscdb')) {
      try {
        const db = new DatabaseSync(full);
        const rows = db.prepare("SELECT key, value FROM ItemTable WHERE key LIKE '%disabled%' OR key LIKE '%chat%' OR key LIKE '%universal%'").all();
        console.log('DB:', full);
        for (const r of rows) {
          console.log('  ', r.key, '->', r.value);
        }
      } catch (e) {
        console.log('Error reading', full, e.message);
      }
    }
  }
}
scanDir(userDir);
