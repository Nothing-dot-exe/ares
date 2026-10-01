# Changes: Ares IDE Desktop Shortcut & Pure Desktop Mode Enforcement

**Date**: 2026-10-01  
**Author**: Antigravity  

---

## 1. Summary of Changes

1. **Created Native Desktop Shortcut**:
   - Updated [`scripts/create-shortcut.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/create-shortcut.mjs).
   - Created `Ares IDE.lnk` at `C:\Users\kadam\OneDrive\Desktop\Ares IDE.lnk`.
   - Updated `Code OSS.lnk` at `C:\Users\kadam\OneDrive\Desktop\Code OSS.lnk`.
   - Both target [`run.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/run.bat) with working directory `c:\Users\kadam\OneDrive\Documents\my hub` and icon `resources\win32\code.ico`.

2. **Native Executable Resolution (`scripts/code.bat`)**:
   - Added robust executable fallback: detects `.build\electron\Ares.exe` or `.build\electron\Code - OSS.exe`.
   - Ensures `Ares.exe` is launched directly into a native desktop Electron window with zero browser tabs or windows.

3. **Pure Desktop Mode Verified**:
   - Cleans old servers on port 8080.
   - Clears multi-window restore cache (`window.restoreWindows = 'none'`).
   - Disables external browser redirection (`workbench.externalBrowser = 'none'`).
