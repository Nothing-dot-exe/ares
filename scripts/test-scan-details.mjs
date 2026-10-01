import * as fs from 'fs';
import * as path from 'path';

// Load package.json for universal-ai
const p = path.resolve('extensions', 'universal-ai', 'package.json');
const manifest = JSON.parse(fs.readFileSync(p, 'utf8'));

// Check how VS Code parses the manifest
import { parseEnabledApiProposalNames } from '../out/vs/platform/extensions/common/extensions.js';
import { validateExtensionManifest } from '../out/vs/platform/extensions/common/extensionValidator.js';
import { URI } from '../out/vs/base/common/uri.js';

console.log('Manifest:', manifest.name, manifest.publisher, manifest.version);
const validations = validateExtensionManifest('1.141.0', new Date(), URI.file(path.resolve('extensions', 'universal-ai')), manifest, true);
console.log('Validations:', validations);
const enabledApi = parseEnabledApiProposalNames([...manifest.enabledApiProposals]);
console.log('Parsed API proposals:', enabledApi);
