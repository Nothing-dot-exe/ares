# Debugging Log: Build & Launch Code OSS Electron App on Windows

**Date**: 2026-09-30  
**Context**: Compiling and launching the desktop Electron edition of Code OSS on Windows 11.

---

## 1. Issue: Missing `build/node_modules` (`gulp-merge-json` missing)
- **Symptom**: `npm run electron` failed with `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'gulp-merge-json' imported from .../build/lib/gulp/facade.ts`.
- **Root Cause**: `build/package.json` dependencies were not installed.
- **Resolution**: Executed `npm --prefix build install` which populated `build/node_modules`.

---

## 2. Issue: Windows Device Guard / Mark-of-the-Web Blocking Electron Executable
- **Symptom**: Running `.build\electron\Code - OSS.exe` triggered:
  `'C:\Users\kadam\OneDrive\Documents\my hub\.build\electron\Code - OSS.exe' was blocked by your organization's Device Guard policy.`
- **Root Cause**: Electron zip was downloaded from GitHub releases, and Windows marked files with the Zone.Identifier alternate data stream.
- **Resolution**: Ran `Get-ChildItem -Path '.build\electron' -Recurse | Unblock-File` which stripped the Mark-of-the-Web and allowed execution.

---

## 3. Issue: Native C++ Binding Module Exceptions during Startup
- **Symptoms**:
  1. `@vscode/policy-watcher`: Threw `Could not locate the bindings file. Tried: .../vscode-policy-watcher.node`.
  2. `@vscode/windows-registry`: Threw `Cannot find module '../build/Release/winregistry.node'` from `getSqmMachineId`.
  3. `@vscode/sqlite3`: Threw `Cannot find module '../build/Release/vscode-sqlite3.node'`.
- **Root Cause**:
  Node native add-ons were not compiled in the repository checkout, but official VS Code 1.139.1 installed at `C:\Users\kadam\AppData\Local\Programs\Microsoft VS Code\` contained prebuilt `.node` binaries for Windows x64 under `resources/app/node_modules.asar.unpacked/`.
- **Resolution**:
  1. Added graceful try-catch in [`src/vs/platform/policy/node/nativePolicyService.ts`](../../src/vs/platform/policy/node/nativePolicyService.ts) and [`out/vs/platform/policy/node/nativePolicyService.js`](../../out/vs/platform/policy/node/nativePolicyService.js).
  2. Fixed unhandled promise rejection in [`src/vs/base/node/id.ts`](../../src/vs/base/node/id.ts) and [`out/vs/base/node/id.js`](../../out/vs/base/node/id.js) so `await import('@vscode/windows-registry')` is properly caught.
  3. Copied prebuilt Windows x64 `.node` native bindings from the installed VS Code into `node_modules/` (`vscode-sqlite3.node`, `spdlog.node`, `vscode-policy-watcher.node`, `winregistry.node`, `iselevated.node`, `conpty.node`, etc.).

---

## 4. Issue: Extension Host Loading & Proposed APIs
- **Symptom**: `universal-ai` needed to be recognized as active in the desktop app with proposed chat APIs enabled.
- **Resolution**:
  1. Added `"custom.universal-ai"` to `"extensionEnabledApiProposals"` in [`product.json`](../../product.json).
  2. Populated `~/.vscode-oss-dev/extensions` with `universal-ai` and Microsoft Python extension suite (`ms-python.python`, `ms-python.vscode-pylance`, `ms-python.debugpy`, `ms-python.vscode-python-envs`).
  3. Verified in logs that Extension Host started with PID 15164 and logged:
     `[Universal AI] Initializing Universal AI Extension...`
     `[Universal AI] Registered Language Model Chat Provider`
     `[Universal AI] Registered Inline Completion Provider for Tab autocomplete.`
     `[Universal AI] Extension activated successfully.`
