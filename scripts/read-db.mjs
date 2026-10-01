import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const dbPath = path.join(process.env.APPDATA, 'code-oss-dev', 'User', 'globalStorage', 'state.vscdb');
const db = new DatabaseSync(dbPath);
const rows = db.prepare("SELECT key, value FROM ItemTable WHERE key LIKE '%extension%' OR key LIKE '%disable%'").all();
console.log('Found rows:', rows);
