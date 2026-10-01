# Changes: Auto-Kill Old Servers on Batch Launch

**Date**: 2026-09-30  
**Author**: Antigravity Assistant  
**Status**: Completed & Verified  

---

## 1. Overview
At user request, configured all launcher batch files ([`run.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/run.bat) and [`run-desktop.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/run-desktop.bat)) to automatically terminate any previously running servers and free port 8080 before launching.

---

## 2. Modified Files

1. **[`scripts/kill-servers.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/kill-servers.mjs)**:
   - Dedicated cross-platform Node script that:
     - Scans `netstat` for any process listening on port 8080 and forcefully kills it (`taskkill /F /PID <pid>`).
     - Scans `wmic` for any orphaned `node.exe` processes running `serve-web.mjs` and kills them.
     - Logs output clearly to terminal.

2. **[`run.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/run.bat)**:
   - Added `call node scripts\kill-servers.mjs` before launching `serve-web.mjs`.

3. **[`run-desktop.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/run-desktop.bat)**:
   - Added `call node scripts\kill-servers.mjs` before launching desktop VS Code.

---

## 3. Verification
* Verified with active server on port 8080: `[INFO] Killed previous server on port 8080 (PID 19320)`.
* Verified clean run: `[INFO] Port 8080 is clean. No old server processes found.`.
* Server rebooted cleanly and verified HTTP 200 on `http://localhost:8080`.
