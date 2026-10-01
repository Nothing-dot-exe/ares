import { URI } from '../out/vs/base/common/uri.js';
import * as path from 'path';
import * as fs from 'fs';

// Let's test scanning all extensions in 'extensions' folder
const extDir = path.resolve('extensions');
const dirs = fs.readdirSync(extDir, { withFileTypes: true }).filter(d => d.isDirectory());
console.log('Total dirs in extensions:', dirs.length);

for (const d of dirs) {
  const pkgPath = path.join(extDir, d.name, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (d.name.includes('universal') || pkg.name?.includes('universal')) {
        console.log('Found universal-ai in extensions:', {
          dir: d.name,
          name: pkg.name,
          publisher: pkg.publisher,
          version: pkg.version,
          activationEvents: pkg.activationEvents
        });
      }
    } catch (e) {
      console.error('Error reading package.json for', d.name, e.message);
    }
  }
}
