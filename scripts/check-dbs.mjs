import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const dbPath = path.join(process.env.APPDATA, 'code-oss-dev', 'User', 'globalStorage', 'state.vscdb');
const db = new DatabaseSync(dbPath);
const rows = db.prepare("SELECT key, value FROM ItemTable WHERE value LIKE '%universal-ai%' OR key LIKE '%universal-ai%'").all();
console.log('Matches in ItemTable:', rows);

const sharedDbPath = 'c:\\Users\\kadam\\.vscode-oss-shared\\sharedStorage\\state.vscdb';
if (require('fs').existsSync(sharedDbPath)) {
  const sdb = new DatabaseSync(sharedDbPath);
  const srows = sdb.prepare("SELECT key, value FROM ItemTable WHERE value LIKE '%universal-ai%' OR key LIKE '%universal-ai%'").all();
  console.log('Matches in Shared ItemTable:', srows);
}
