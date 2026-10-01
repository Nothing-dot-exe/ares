import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const dbPath = path.join(process.env.APPDATA, 'code-oss-dev', 'User', 'globalStorage', 'state.vscdb');
const db = new DatabaseSync(dbPath);
const row = db.prepare("SELECT key, value FROM ItemTable WHERE key = 'extensionsIdentifiers/disabled'").get();
console.log('Disabled extensions value:', row);
