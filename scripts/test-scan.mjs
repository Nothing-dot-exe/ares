import { URI } from '../out/vs/base/common/uri.js';
import * as path from 'path';
import * as fs from 'fs';

const extPath = path.resolve('extensions');
const dirs = fs.readdirSync(extPath);

console.log('Extensions directory has', dirs.length, 'entries.');

const uniPkgPath = path.join(extPath, 'universal-ai', 'package.json');
const uniPkg = JSON.parse(fs.readFileSync(uniPkgPath, 'utf8'));

console.log('Universal AI package:', uniPkg.name, uniPkg.publisher, uniPkg.version);

import { parseEnabledApiProposalNames } from '../out/vs/platform/extensions/common/extensions.js';
import { validateExtensionManifest } from '../out/vs/platform/extensions/common/extensionValidator.js';

const val = validateExtensionManifest('1.141.0', new Date(), URI.file(path.join(extPath, 'universal-ai')), uniPkg, true);
console.log('Validation errors:', val);
