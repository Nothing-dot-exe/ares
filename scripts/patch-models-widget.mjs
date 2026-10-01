// scripts/patch-models-widget.mjs
// Patches the web runtime bundle to replace Copilot with Universal AI actions and Test Key action

import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const testWebDir = path.join(ROOT_DIR, '.vscode-test-web');

let bundlePath = null;
if (fs.existsSync(testWebDir)) {
  const entries = fs.readdirSync(testWebDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('vscode-web-')) {
      const candidate = path.join(testWebDir, entry.name, 'out', 'vs', 'workbench', 'workbench.web.main.internal.js');
      if (fs.existsSync(candidate)) {
        bundlePath = candidate;
        break;
      }
    }
  }
}

if (!bundlePath) {
  console.error('[Error] Could not locate workbench.web.main.internal.js');
  process.exit(1);
}

let content = fs.readFileSync(bundlePath, 'utf8');

const targetStr = `this.dropdownActions=dFr(e,n,r=>this.addModelsForVendor(r),this.defaultAccountResolved&&this.defaultAccountService.currentDefaultAccount===null?()=>this.commandService.executeCommand(yg):void 0),this.addButton.enabled=this.dropdownActions.length>0,this.addButton.setTitle(!n&&i?d(11466,null):"")`;

const replacementStr = `this.dropdownActions=[jt({id:"universal-ai.addModel",label:"Add AI Model...",run:()=>this.commandService.executeCommand("universal-ai.addModel")}),jt({id:"universal-ai.testApiKey",label:"Test API Key Connection...",run:()=>this.commandService.executeCommand("universal-ai.testApiKey")}),jt({id:"universal-ai.setApiKey",label:"Configure API Keys...",run:()=>this.commandService.executeCommand("universal-ai.setApiKey")}),new ei,jt({id:"universal-ai.addGroq",label:"Add Groq Model",run:()=>this.commandService.executeCommand("universal-ai.addModel","Groq")}),jt({id:"universal-ai.addOpenRouter",label:"Add OpenRouter Model",run:()=>this.commandService.executeCommand("universal-ai.addModel","OpenRouter")}),jt({id:"universal-ai.addNvidia",label:"Add NVIDIA Model",run:()=>this.commandService.executeCommand("universal-ai.addModel","NVIDIA")}),jt({id:"universal-ai.addOllama",label:"Add Local Ollama Model",run:()=>this.commandService.executeCommand("universal-ai.addModel","Local Ollama")}),jt({id:"universal-ai.addCustom",label:"Add Custom OpenAI Model",run:()=>this.commandService.executeCommand("universal-ai.addModel","Custom")})],this.addButton.enabled=!0,this.addButton.setTitle("Add language models and test API keys")`;

const oldWithOmniRoute = `jt({id:"universal-ai.addOmniRoute",label:"Add OmniRoute Model",run:()=>this.commandService.executeCommand("universal-ai.addModel","OmniRoute")}),`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(bundlePath, content, 'utf8');
  console.log('[Success] Successfully patched ModelsWidget in web runtime bundle!');
} else if (content.includes(oldWithOmniRoute)) {
  content = content.replace(oldWithOmniRoute, '');
  fs.writeFileSync(bundlePath, content, 'utf8');
  console.log('[Success] Removed OmniRoute action from ModelsWidget bundle!');
} else if (content.includes('universal-ai.addModel')) {
  console.log('[Notice] ModelsWidget is already clean without OmniRoute.');
} else {
  console.error('[Error] Could not find target pattern in workbench.web.main.internal.js');
  process.exit(1);
}
