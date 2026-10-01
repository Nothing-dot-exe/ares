import { URI } from '../out/vs/base/common/uri.js';
import * as path from 'path';
import * as fs from 'fs';

import { validateExtensionManifest } from '../out/vs/platform/extensions/common/extensionValidator.js';

const universalAiDir = path.resolve('extensions', 'universal-ai');
const pkgPath = path.join(universalAiDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

console.log('Manifest name:', pkg.name);
console.log('Manifest publisher:', pkg.publisher);
console.log('Engines:', pkg.engines);

const validations = validateExtensionManifest('1.141.0', new Date(), URI.file(universalAiDir), pkg, true);
console.log('Validations (builtin):', validations);
const validationsUser = validateExtensionManifest('1.141.0', new Date(), URI.file(universalAiDir), pkg, false);
console.log('Validations (user):', validationsUser);
