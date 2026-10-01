# Debugging: Terminal Process Failed to Launch (conpty.dll Missing)

**Date**: 2026-09-30  
**Status**: Resolved  

---

## 1. Problem Statement
When opening a terminal inside the Code OSS Electron Desktop application, a native error modal was displayed:
```
The terminal process failed to launch: A native exception occurred during launch (Cannot find conpty.dll at c:\Users\kadam\OneDrive\Documents\my hub\node_modules\node-pty\build\Release\conpty\conpty.dll, error code: 3).
```

---

## 2. Root Cause Analysis
- `node-pty` on Windows uses ConPTY (Windows Pseudo Console) via native C++ bindings in `node_modules/node-pty/src/win/conpty.cc`.
- `conpty.node` expects `conpty.dll` and `OpenConsole.exe` to reside in a subfolder named `conpty/` next to the compiled `.node` binary (i.e. `node_modules/node-pty/build/Release/conpty/conpty.dll`).
- While prebuilt copies existed in `node_modules/node-pty/prebuilds/win32-x64/conpty/` and `third_party/conpty/`, the `build/Release/conpty/` directory had not been populated because `node-pty`'s post-install script (`post-install.js`) had not run against the `build/Release` target.

---

## 3. Resolution
1. **Executed Post-Install Deployment**:
   Ran `node node_modules/node-pty/scripts/post-install.js`, which deployed `conpty.dll` and `OpenConsole.exe` from `third_party/conpty/1.25.260303002/win10-x64/` to `build/Release/conpty/`.
2. **Automated Future Self-Healing**:
   Updated [`scripts/prepare-desktop.mjs`](../../scripts/prepare-desktop.mjs) to check for the presence of `conpty.dll` before every launch and automatically deploy it if missing.
3. **Verified Spawn**:
   Tested `node-pty.spawn('powershell.exe')` via Node, confirming successful PTY creation and process lifecycle.
