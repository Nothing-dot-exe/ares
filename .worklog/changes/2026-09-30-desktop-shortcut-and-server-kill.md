# Changes: Desktop Shortcut Creation & Server Cleanup Tool

**Date**: 2026-09-30  
**Author**: Antigravity  

---

## 1. Summary of Changes

1. **Created Desktop Shortcut Generator**:
   - Added [`scripts/create-shortcut.mjs`](../../scripts/create-shortcut.mjs) which creates a Windows Shell `.lnk` shortcut at `C:\Users\kadam\OneDrive\Desktop\Code OSS.lnk`.
   - Targets [`run-electron.bat`](../../run-electron.bat) with working directory set to `c:\Users\kadam\OneDrive\Documents\my hub` and icon set to `resources\win32\code.ico`.
   - Executed script and confirmed `Code OSS.lnk` is present on the user's desktop.

2. **Cleaned All Stale Servers & Processes**:
   - Executed [`scripts/kill-servers.mjs`](../../scripts/kill-servers.mjs) to free port 8080 and terminate orphaned web server processes.
   - Force-stopped lingering `Code - OSS` background processes.

3. **Launched Clean Desktop Instance**:
   - Re-launched Code OSS Electron Desktop application via [`run-electron.bat`](../../run-electron.bat) with disabled crashing native Copilot SDK modules.
