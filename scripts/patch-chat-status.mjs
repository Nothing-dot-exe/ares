import fs from 'fs';
import path from 'path';

const bundlePath = path.resolve('.vscode-test-web/vscode-web-insider-e741ab1c964b9fbb11bffed2c0a145af22dad54f/out/vs/workbench/workbench.web.main.internal.js');
let content = fs.readFileSync(bundlePath, 'utf8');

console.log('Original bundle size:', content.length);

// 1. canUseChat - always allow using chat/dashboard without Microsoft subscription
const canUseChatTarget = 'canUseChat(){return!this.chatEntitlementService.sentiment.completed||this.chatEntitlementService.sentiment.disabled||this.chatEntitlementService.sentiment.untrusted?!1:this.chatEntitlementService.entitlement===1||this.chatEntitlementService.entitlement===3?this.chatEntitlementService.anonymous:!(this.chatEntitlementService.entitlement===5&&this.chatEntitlementService.quotas.chat?.percentRemaining===0&&this.chatEntitlementService.quotas.completions?.percentRemaining===0)}';
const canUseChatReplacement = 'canUseChat(){return!0}';

if (content.includes(canUseChatTarget)) {
  content = content.replace(canUseChatTarget, canUseChatReplacement);
  console.log('✓ Successfully patched canUseChat() to always return true');
} else {
  console.log('ℹ canUseChat already patched');
}

const renderSetupRegex = /renderSetupSection\(\)\{[\s\S]*?\}(?=renderInlineSuggestionsContent\()/;
const newMasterButtonCode = 'renderSetupSection(){this.element.appendChild(T("hr"));let e=this.element.appendChild(T("div.description")),t=this._store.add(new Zt(this.element,{...Gi,hoverDelegate:mR})),s=dH.completionsEnablementSetting,g=()=>{let n=this.editorService.activeTextEditorLanguageId;return n?T9(this.configurationService,n):T9(this.configurationService,"*")},i=()=>{let r=g();e.textContent=r?"Universal AI inline completions are active.":"Universal AI inline completions are disabled.",t.label=r?"Disable Inline Suggestions":"Enable Inline Suggestions"};i(),this._store.add(t.onDidClick(async()=>{let r=g(),a=!r,n=this.editorService.activeTextEditorLanguageId,cur=this.configurationService.getValue(s),next=bi(cur)?{...cur}:Object.create(null);if(!a){for(let k of Object.keys(next))next[k]=!1;next["*"]=!1}else{next["*"]=!0,n&&(next[n]=!0)}await this.configurationService.updateValue(s,next),await this.configurationService.updateValue("editor.inlineSuggest.enabled",a),i()})),this._store.add(this.configurationService.onDidChangeConfiguration(n=>{(n.affectsConfiguration(s)||n.affectsConfiguration("editor.inlineSuggest.enabled"))&&i()}))}';

if (renderSetupRegex.test(content)) {
  content = content.replace(renderSetupRegex, newMasterButtonCode);
  console.log('✓ Successfully installed robust Enable/Disable button in renderSetupSection()');
} else {
  console.log('ℹ renderSetupSection not matched');
}

// 3. getEntryProps in chatStatusEntry: Show $(copilot-unavailable) whenever suggestions are disabled
const oldGetEntryPropsRegex = /getEntryProps\(\)\{let e="\$\(copilot\)",t=d\(11898,null\),i,n=this\.dashboardTooltip;[\s\S]*?tooltip:n\}\}/;
const newGetEntryProps = 'getEntryProps(){let e="$(copilot)",t=d(11898,null),i,n=this.dashboardTooltip,l=this.editorService.activeTextEditorLanguageId,o=l?T9(this.configurationService,l):T9(this.configurationService,"*");if(!o)e="$(copilot-unavailable)",t=d(11899,null);else if(this.completionsService.isSnoozing())e="$(copilot-snooze)",t=d(11900,null);return{name:d(11897,null),text:e,ariaLabel:t,command:Gre,showInAllWindows:!0,kind:i,content:this.entryAnchor,tooltip:n}}';
if (oldGetEntryPropsRegex.test(content)) {
  content = content.replace(oldGetEntryPropsRegex, newGetEntryProps);
  console.log('✓ Successfully patched chatStatusEntry.getEntryProps() with global fallback');
}

// 4. HWt(): keep original false default — user controls enable/disable manually
const hwtTarget = 'function HWt(s,o="*"){return bi(s)?typeof s[o]<"u"?!!s[o]:typeof s["*"]<"u"?!!s["*"]:!0:!0}';
const hwtOriginal = 'function HWt(s,o="*"){return bi(s)?typeof s[o]<"u"?!!s[o]:!!s["*"]:!1}';
if (content.includes(hwtTarget)) {
  content = content.replace(hwtTarget, hwtOriginal);
  console.log('✓ HWt() reverted to default false (no auto-enable)');
} else if (content.includes(hwtOriginal)) {
  console.log('ℹ HWt already at original false default');
}

// 5. Clean binary toggle for language checkbox
const triStateToggleOld = 'f=()=>c===!0?!1:c===!1?"mixed":!0';
const triStateToggleNew = 'f=()=>!c';
if (content.includes(triStateToggleOld)) {
  content = content.replace(triStateToggleOld, triStateToggleNew);
  console.log('✓ Successfully simplified language checkbox to clean on/off toggle (no "mixed" cycle)');
} else {
  console.log('ℹ Language checkbox toggle already patched');
}

// 6. Accordion: always start EXPANDED
const accordionTarget = 'i=!t&&this.storageService.getBoolean(ete.QUICK_SETTINGS_COLLAPSED_KEY,0,!0)';
if (content.includes(accordionTarget)) {
  content = content.replace(accordionTarget, 'i=!1');
  console.log('✓ Accordion always expanded by default');
} else {
  console.log('ℹ Accordion already patched');
}

// 7. Remove Snooze button
const snoozeTarget = 'if(!this.options?.disableCompletionsSnooze&&this.canUseChat()){let i=E(e,T("div.snooze-completions"));this.createCompletionsSnooze(i,d(11891,null))}';
if (content.includes(snoozeTarget)) {
  content = content.replace(snoozeTarget, 'if(!1){}');
  console.log('✓ Snooze button permanently removed');
} else {
  console.log('ℹ Snooze already removed');
}

// 8. createSettings language fallback
const langTarget = 'createSettings(e){let t=this.editorService.activeTextEditorLanguageId,i=e.appendChild(T("div.settings"))';
const langReplacement = 'createSettings(e){let t=this.editorService.activeTextEditorLanguageId||this.editorService.activeEditor?.getLanguageId?.()||this.editorService.activeEditor?.languageId,i=e.appendChild(T("div.settings"))';
if (content.includes(langTarget)) {
  content = content.replace(langTarget, langReplacement);
  console.log('✓ Language ID fallback added to createSettings');
} else {
  console.log('ℹ Language fallback already patched');
}

// 9. NES always interactive — remove artificial disable logic
const nesTarget = 'createNextEditSuggestionsSetting(e,t,i){let n=dH.nextEditSuggestionsSetting,r=dH.completionsEnablementSetting,a=Ao.getOriginalUri(this.editorService.activeEditor,{supportSideBySide:1}),c=this.createSetting(e,[n,r],t,{readSetting:()=>i.readSetting()&&this.textResourceConfigurationService.getValue(a,n),writeSetting:l=>(this.telemetryService.publicLog2("chatStatus.settingChanged",{settingIdentifier:n,settingEnablement:l?"enabled":"disabled"}),this.textResourceConfigurationService.updateValue(a,n,l))});i.readSetting()||(e.classList.add("disabled"),c.disable()),this._store.add(this.configurationService.onDidChangeConfiguration(l=>{l.affectsConfiguration(r)&&(i.readSetting()&&this.canUseChat()?(c.enable(),e.classList.remove("disabled")):(c.disable(),e.classList.add("disabled")))}))}';
const nesReplacement = 'createNextEditSuggestionsSetting(e,t,i){let n=dH.nextEditSuggestionsSetting,r=dH.completionsEnablementSetting,a=Ao.getOriginalUri(this.editorService.activeEditor,{supportSideBySide:1});this.createSetting(e,[n,r],t,{readSetting:()=>!!this.textResourceConfigurationService.getValue(a,n),writeSetting:l=>(this.telemetryService.publicLog2("chatStatus.settingChanged",{settingIdentifier:n,settingEnablement:l?"enabled":"disabled"}),this.textResourceConfigurationService.updateValue(a,n,l))})}';
if (content.includes(nesTarget)) {
  content = content.replace(nesTarget, nesReplacement);
  console.log('✓ Next edit suggestions always interactive (never gray/locked)');
} else {
  console.log('ℹ NES locking already patched');
}

// 10. getCompletionsSettingAccessor: Clone object and keep editor.inlineSuggest.enabled synchronized
const oldAccessor = 'getCompletionsSettingAccessor(e="*"){let t=dH.completionsEnablementSetting;return{readSetting:()=>T9(this.configurationService,e),writeSetting:i=>{this.telemetryService.publicLog2("chatStatus.settingChanged",{settingIdentifier:t,settingMode:e,settingEnablement:i?"enabled":"disabled"});let n=this.configurationService.getValue(t);return bi(n)||(n=Object.create(null)),this.configurationService.updateValue(t,{...n,[e]:i})}}}';
const newAccessor = 'getCompletionsSettingAccessor(e="*"){let t=dH.completionsEnablementSetting;return{readSetting:()=>T9(this.configurationService,e),writeSetting:async i=>{this.telemetryService.publicLog2("chatStatus.settingChanged",{settingIdentifier:t,settingMode:e,settingEnablement:i?"enabled":"disabled"});let n=this.configurationService.getValue(t),next=bi(n)?{...n}:Object.create(null);next[e]=i;if(!i&&e==="*"){for(let k of Object.keys(next))next[k]=!1}await this.configurationService.updateValue(t,next);await this.configurationService.updateValue("editor.inlineSuggest.enabled",i)}}}';
if (content.includes(oldAccessor)) {
  content = content.replace(oldAccessor, newAccessor);
  console.log('✓ Successfully patched getCompletionsSettingAccessor with sync & clone logic');
} else if (content.includes(newAccessor)) {
  console.log('ℹ getCompletionsSettingAccessor already patched');
}

fs.writeFileSync(bundlePath, content, 'utf8');
console.log('New bundle size:', content.length);
console.log('Done!');
