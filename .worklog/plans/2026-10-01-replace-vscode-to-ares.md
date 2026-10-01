# Plan: Rebrand "VS Code" / "Code - OSS" to "Ares IDE"

**Date**: 2026-10-01  
**Author**: Antigravity  
**Goal**: Completely replace all user-visible and environment occurrences of "VS Code" and "Code - OSS" with "Ares" / "Ares IDE", while strictly preserving OG AI models and Universal AI vendor configuration.

---

## 1. Scope & Constraints
- **Preserve AI Subsystem**: Per explicit user directive ("dont add ares in ai model keeo them og dont connect with ares"), DO NOT touch model IDs (`GPT-OSS 120B`, `Qwen 3.8`, `qwen3.8-27b-uncensored-mtp`), vendor (`universal-ai`), or chat participant (`@ai`).
- **Complete Branding Transformation**:
  1. Desktop Shortcuts: Remove legacy `Code OSS.lnk` from Desktop; ensure only `Ares IDE.lnk` is present.
  2. Launchers: Update `run.bat`, `run-electron.bat`, and `scripts/code.bat` to display "Ares IDE".
  3. Product Definition: Update `product.json` (`win32AppUserModelId`, `win32RegValueName`, `win32MutexName`, onboarding keymaps).
  4. Runtime Product Service: Update `src/vs/platform/product/common/product.ts` to output `Ares` and `Ares IDE` without appending `Dev`.
  5. UI Strings: Update `gettingStartedContent.ts` to display "Ares IDE" on the Welcome/Getting Started page.

---

## 2. Execution Steps
1. **Desktop Shortcuts**:
   - Edit `scripts/create-shortcut.mjs` to remove `Code OSS.lnk` and create `Ares IDE.lnk`.
   - Run `node scripts/create-shortcut.mjs` to update the user's desktop immediately.
2. **Launchers**:
   - Update `run.bat`, `run-electron.bat`, and `scripts/code.bat`.
   - Update `scripts/prepare-desktop.mjs` to terminate `Ares.exe` alongside `Code - OSS.exe`.
3. **Product Configuration & Fallbacks**:
   - Update `product.json`.
   - Update `src/vs/platform/product/common/product.ts`.
4. **Welcome Page & UI Strings**:
   - Update `gettingStartedContent.ts`.
5. **Verification**:
   - Verify desktop shortcuts.
   - Verify `prepare-desktop.mjs` runs cleanly.
   - Test launch and verify window title and process identification.
6. **Worklog Updates**:
   - Record changes in `.worklog/changes/`.
   - Update `.worklog/CURRENT_STATE.md`.
