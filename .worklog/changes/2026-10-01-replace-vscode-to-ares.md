# Changes: Replaced "VS Code" / "Code - OSS" with "Ares IDE"

**Date**: 2026-10-01  
**Author**: Antigravity  
**Goal**: Complete rebranding of the desktop editor shell, launchers, shortcuts, and welcome UI from VS Code / Code - OSS to Ares IDE while keeping AI models 100% original.

---

## 1. Modified Files

1. **[`scripts/create-shortcut.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/create-shortcut.mjs)**:
   - Added automatic deletion of legacy `Code OSS.lnk` from Windows desktop directories.
   - Configured creation of both `Ares IDE.lnk` and `Ares.lnk` pointing to `run.bat`.
   - Executed and verified shortcut replacement on `C:\Users\kadam\OneDrive\Desktop`.

2. **[`run.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/run.bat)**:
   - Updated window title to `Ares IDE - Native Desktop Application`.
   - Updated banner and launch messages to `Ares IDE Native Desktop Application`.

3. **[`run-electron.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/run-electron.bat)**:
   - Updated window title to `Ares IDE - Desktop Edition`.
   - Updated launch logs and comments to `Ares IDE Desktop Application`.

4. **[`scripts/code.bat`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/code.bat)**:
   - Updated window title from `VSCode Dev` to `Ares IDE`.
   - Updated prelaunch failure message to `Ares IDE`.

5. **[`scripts/prepare-desktop.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/prepare-desktop.mjs)**:
   - Added process termination for `Ares.exe` in addition to `Code - OSS.exe`.
   - Updated logs and headers to reflect `Ares IDE`.

6. **[`product.json`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/product.json)**:
   - Updated `win32AppUserModelId` to `Ares.IDE` (ensures Windows taskbar groups windows under Ares IDE).
   - Updated `win32RegValueName` to `AresIDE` and `win32MutexName` to `areside`.
   - Updated `darwinBundleIdentifier` to `com.ares.ide`, `linuxDesktopName` to `ares.AresIDE`, and `linuxIconName` to `ares`.
   - Updated `onboardingKeymaps` default entry label from `VS Code` to `Ares (Default)`.

7. **[`src/vs/platform/product/common/product.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/platform/product/common/product.ts)**:
   - Stopped appending `Dev` to `nameShort` and `nameLong` in development mode, so the title bar and About dialog cleanly display `Ares` and `Ares IDE`.
   - Updated fallback product configuration from `Code - OSS Dev` to `Ares` and `Ares IDE`.

8. **[`src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts)**:
   - Replaced all user-facing strings ("Get started with VS Code", "Setup VS Code", "VS Code's key features", etc.) with "Ares IDE".

9. **[`README.md`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/README.md)**:
   - Updated project title to `Ares IDE — Native AI Code Editor`.

---

## 2. Model Integrity (OG Preserved)
- Confirmed zero modifications to AI model IDs or providers.
- Kept `vendor: "universal-ai"` and `@ai` active and functional per explicit user constraint.
