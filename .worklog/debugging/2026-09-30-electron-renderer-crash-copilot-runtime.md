# Debugging: Electron Renderer Crash & Web vs Desktop Discrepancy

**Date**: 2026-09-30  
**Status**: Resolved  

---

## 1. Problem Statements

1. **Web Environment Constraints**:
   - In VS Code for the Web (`http://localhost:8080`), user encountered `'Python' has limited functionality in Visual Studio Code for the Web` and a blank terminal panel.
   - User could not open arbitrary local drives or spawn local shell processes.

2. **Electron Desktop App Blank Window**:
   - Launching [`run-electron.bat`](../../run-electron.bat) initially produced an empty dark window frame without workbench UI.
   - Log showed: Electron renderer process crashing repeatedly upon launch.

---

## 2. Root Cause Analysis

1. **Web Environment**:
   - Running in Chrome runs in a browser sandbox without direct access to the Windows host OS (e.g. `powershell.exe`, local Python binaries, or direct file system access).
   - Python extensions require local host interpreters and PTY terminals require local OS process creation.

2. **Renderer Process Crash in Electron**:
   - The bundled GitHub Copilot native binary (`@github/copilot-sdk-win32-x64/prebuilds/win32-x64/copilot-runtime.exe` and `runtime.node`) attempted to bind via `GetProcAddress` and failed with a native DLL mismatch.
   - This fatal exception propagated through the AgentHost and caused Electron's Chromium renderer process to die (`renderer process gone: crashed`).

---

## 3. Resolution & Fixes

1. **Disabled Failing Native Copilot Binaries**:
   - Renamed `copilot-runtime.exe` -> `copilot-runtime.exe.disabled` and `runtime.node` -> `runtime.node.disabled` in `node_modules/@github/copilot-sdk-win32-x64/prebuilds/win32-x64/`.
   - Prevents AgentHost from attempting to load the incompatible native SDK.

2. **Updated Launch Script**:
   - In [`scripts/code.bat`](../../scripts/code.bat), appended `--disable-extension=vscode.copilot` and `--disable-gpu` to ensure renderer stability.

3. **Restored Built-in Extensions**:
   - All 30 core extensions restored from `dist/` to `out/` structure to ensure syntax highlighting, Git, and Marketplace extension installation work smoothly.

4. **Launcher Verification**:
   - [`run-electron.bat`](../../run-electron.bat) cleans up lingering processes, unblocks binaries, starts the AI proxy, and invokes [`scripts/code.bat`](../../scripts/code.bat).
