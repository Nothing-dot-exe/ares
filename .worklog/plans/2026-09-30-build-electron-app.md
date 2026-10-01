# Plan: Build & Run Code OSS Electron App

**Date**: 2026-09-30  
**Objective**: Build and launch the full Code OSS desktop (Electron) app from repository sources.

---

## 1. Context & Motivation
- The user requested: *"ok lets build elecrton app right now"*.
- The user wants the native desktop experience with full extension ecosystem support and the custom `universal-ai` extension integrated.
- The web edition (`scripts/serve-web.mjs`) is working, but compiling the Electron app requires building `out/` and fetching the matching Electron shell binary.

---

## 2. Prerequisites & Architecture
1. **Build Tooling Dependencies**:
   - `build/lib/electron.ts` requires packages from `build/package.json` (such as `gulp-merge-json`, `@electron/get`, `extract-zip`).
   - Need to run `npm --prefix build install` to populate `build/node_modules`.

2. **Electron Binary Acquisition**:
   - `node build/lib/electron.ts` (or `npm run electron`) fetches the specified Electron binary into `.build/electron/`.
   - The version is checked via `build/lib/electronVersion.ts` against `product.json` and `.build/electron/version`.

3. **Core Client Compilation (`out/`)**:
   - Source code must be compiled into `out/`.
   - Running `npm run compile-client` (which invokes `npm run gulp compile`) compiles TypeScript and assets into `out/`.
   - `universal-ai` is already located in `extensions/universal-ai/` and will be loaded as an extension.

4. **Launcher Execution**:
   - Launch via `scripts\code.bat` or `.build\electron\Code - OSS.exe .`.
   - In `run-desktop.bat` or a dedicated launcher script, ensure old servers/processes are cleaned up.

---

## 3. Step-by-Step Execution Plan
1. **Install Build Dependencies**:
   - Command: `npm --prefix build install`
   - Verify `build/node_modules/gulp-merge-json` is present.
2. **Download Electron Runtime**:
   - Command: `npm run electron`
   - Verify `.build/electron/` exists with the executable (`Code - OSS.exe`).
3. **Compile Code OSS Client**:
   - Command: `npm run compile-client`
   - Monitor output and verify `out/main.js` and `out/vs/workbench/workbench.desktop.main.js` are created.
4. **Launch & Verify Electron App**:
   - Run `.\scripts\code.bat` or `.build\electron\Code - OSS.exe .`.
   - Confirm the desktop window opens cleanly.
   - Confirm Universal AI provider appears in the status bar (`AI: Groq`).
5. **Update Worklog**:
   - Document changes in `.worklog/changes/` and update `.worklog/CURRENT_STATE.md`.
