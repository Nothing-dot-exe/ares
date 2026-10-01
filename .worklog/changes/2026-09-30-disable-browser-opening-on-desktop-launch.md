# Changes: Disable Browser Auto-Opening on Desktop Launch

**Date**: 2026-09-30  
**Author**: Antigravity  

---

## 1. Summary of Changes

1. **Disabled Auto-Opening Chrome in [`scripts/serve-web.mjs`](../../scripts/serve-web.mjs)**:
   - Changed `openBrowser` condition from `process.argv.includes('--open') || !process.argv.includes('--no-open')` to strictly `process.argv.includes('--open')`.
   - Now the HTTP proxy server starts silently without spawning Google Chrome or opening any browser tab.

2. **Updated Launchers**:
   - In [`run-electron.bat`](../../run-electron.bat), appended `--no-open` to `node scripts/serve-web.mjs`.
   - In [`run.bat`](../../run.bat) (Web edition runner), explicitly passed `--open` so that opening the Web version continues to open Chrome as intended when specifically requested.

3. **Confirmed Desktop Shortcut Behavior**:
   - Double-clicking the [`Code OSS`](file:///C:/Users/kadam/OneDrive/Desktop/Code%20OSS.lnk) desktop shortcut now launches ONLY the native Code OSS Electron application without opening any browser tabs.
