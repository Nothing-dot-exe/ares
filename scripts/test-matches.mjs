import fs from 'fs';
const bundlePath = '.vscode-test-web/vscode-web-insider-e741ab1c964b9fbb11bffed2c0a145af22dad54f/out/vs/workbench/workbench.web.main.internal.js';
let content = fs.readFileSync(bundlePath, 'utf8');

// 1. Accordion default expanded
const accordionTarget = 'i=!t&&this.storageService.getBoolean(ete.QUICK_SETTINGS_COLLAPSED_KEY,0,!0)';
const accordionReplacement = 'i=!1';

// 2. Remove snooze button
const snoozeTarget = 'if(!this.options?.disableCompletionsSnooze&&this.canUseChat()){let i=E(e,T("div.snooze-completions"));this.createCompletionsSnooze(i,d(11891,null))}';
const snoozeReplacement = 'if(!1){}';

// 3. Keep Next edit suggestions interactive & never disabled
const nesTarget = 'createNextEditSuggestionsSetting(e,t,i){let n=dH.nextEditSuggestionsSetting,r=dH.completionsEnablementSetting,a=Ao.getOriginalUri(this.editorService.activeEditor,{supportSideBySide:1}),c=this.createSetting(e,[n,r],t,{readSetting:()=>i.readSetting()&&this.textResourceConfigurationService.getValue(a,n),writeSetting:l=>(this.telemetryService.publicLog2("chatStatus.settingChanged",{settingIdentifier:n,settingEnablement:l?"enabled":"disabled"}),this.textResourceConfigurationService.updateValue(a,n,l))});i.readSetting()||(e.classList.add("disabled"),c.disable()),this._store.add(this.configurationService.onDidChangeConfiguration(l=>{l.affectsConfiguration(r)&&(i.readSetting()&&this.canUseChat()?(c.enable(),e.classList.remove("disabled")):(c.disable(),e.classList.add("disabled")))}))}';
const nesReplacement = 'createNextEditSuggestionsSetting(e,t,i){let n=dH.nextEditSuggestionsSetting,r=dH.completionsEnablementSetting,a=Ao.getOriginalUri(this.editorService.activeEditor,{supportSideBySide:1});this.createSetting(e,[n,r],t,{readSetting:()=>!!this.textResourceConfigurationService.getValue(a,n),writeSetting:l=>(this.telemetryService.publicLog2("chatStatus.settingChanged",{settingIdentifier:n,settingEnablement:l?"enabled":"disabled"}),this.textResourceConfigurationService.updateValue(a,n,l))})}';

// 4. Language fallback in createSettings
const langTarget = 'createSettings(e){let t=this.editorService.activeTextEditorLanguageId,i=e.appendChild(T("div.settings"))';
const langReplacement = 'createSettings(e){let t=this.editorService.activeTextEditorLanguageId||this.editorService.activeEditor?.getLanguageId?.()||this.editorService.activeEditor?.languageId,i=e.appendChild(T("div.settings"))';

console.log('Accordion found:', content.includes(accordionTarget));
console.log('Snooze found:', content.includes(snoozeTarget));
console.log('NES found:', content.includes(nesTarget));
console.log('Lang found:', content.includes(langTarget));
