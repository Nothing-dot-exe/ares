# Changes: Single-Window Enforcement & GPU Rendering Fix

**Date**: 2026-09-30  
**Author**: Antigravity  

---

## 1. Summary of Changes

1. **Fixed Black/Blank Electron Window (`--disable-gpu` Removal)**:
   - In [`scripts/code.bat`](../../scripts/code.bat), removed `--disable-gpu`.
   - On Windows, Electron's custom title bar and frameless windows with `--disable-gpu` fail to repaint properly, causing the window interior to render as a completely blank dark box. Enabling GPU acceleration restores full hardware compositing and normal UI rendering.

2. **Enforced Single-Window Startup (`scripts/prepare-desktop.mjs`)**:
   - Added [`scripts/prepare-desktop.mjs`](../../scripts/prepare-desktop.mjs) which:
     - Terminates all previous `Code - OSS.exe` processes and frees port `8080`.
     - Clears stale multi-window workspace caches in `AppData/Roaming/code-oss-dev/User/workspaceStorage` and `Backups/`.
     - Injects `"window.restoreWindows": "none"` and `"window.openWithoutArgumentsInNewWindow": "off"` into `AppData/Roaming/code-oss-dev/User/settings.json`.
     - Prevents VS Code from reopening multiple windows from past sessions.

3. **Updated Desktop Launcher ([`run-electron.bat`](../../run-electron.bat))**:
   - Integrated [`scripts/prepare-desktop.mjs`](../../scripts/prepare-desktop.mjs) into step 1 of [`run-electron.bat`](../../run-electron.bat).
   - Starts exactly one background AI streaming proxy on port `8080`.
   - Launches exactly one desktop window.
