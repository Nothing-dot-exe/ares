# Plan: Enable Universal AI in Electron Desktop Mode

## Objective
Ensure Universal AI (`vscode.universal-ai`) loads, activates, and functions completely in Desktop Electron mode (`run-electron.bat` / `scripts/code.bat`), matching the browser mode experience with `$(sparkle) AI: Groq (Ready)` in the status bar, chat participant `@ai`, and models.

## Root Causes Identified
1. **Auto-Disabling by Chat Entitlement Migration**:
   - `extensionEnablementService.ts` checks `productService.defaultChatAgent?.chatExtensionId` (`vscode.universal-ai`).
   - Because Universal AI uses direct API keys (Groq, OpenRouter, NVIDIA, Ollama) rather than Microsoft Copilot account entitlements, `context.value.state.completed` is false.
   - `ensureChatExtensionInitialDisabledState()` called `this._disableExtension({ id: this._chatExtensionId })`, writing `vscode.universal-ai` to `extensionsIdentifiers/disabled` in `state.vscdb`.
   - `filterEnabledExtensions()` then dropped `vscode.universal-ai`, preventing it from ever reaching `exthost`.

2. **Aggressive Cleanup in prepare-desktop.mjs**:
   - `prepare-desktop.mjs` was actively deleting `.vscode-oss-dev/extensions/universal-ai` and stripping `universal-ai` from `extensions.json`.

3. **Stale SQLite DB Entries**:
   - `state.vscdb` retained `chat.setupContext.disabled: true` and `extensionsIdentifiers/disabled` records.

4. **API Proposal and Vendor Registration**:
   - Chat participant and language model registration needed resilient handling for the `universal-ai` vendor in both compiled and source files.

## Step-by-Step Implementation
1. **Patch `extensionEnablementService.ts` (source and compiled)**:
   - In `ensureChatExtensionInitialDisabledState()`: skip migration if `_chatExtensionId` contains `universal-ai`.
   - In `_computeEnablementState()`: enforce `EnablementState.EnabledGlobally` for `vscode.universal-ai` and `custom.universal-ai`.
   - In `_isDisabledInEnv()`: ensure `universal-ai` is never disabled.
2. **Patch `chatParticipant.contribution.ts` & `languageModels.ts` (source and compiled)**:
   - Ensure `chatParticipant.contribution.ts` allows `universal-ai` default chat participant without throwing proposal errors.
   - Ensure `languageModels.ts` auto-registers vendor `universal-ai`.
3. **Enhance `scripts/prepare-desktop.mjs`**:
   - Clean any disabled entries for `universal-ai` from all `state.vscdb` databases.
   - Sync `extensions/universal-ai` to `.vscode-oss-dev/extensions/universal-ai`.
   - Ensure `.vscode-oss-dev/extensions/extensions.json` contains `vscode.universal-ai`.
   - Set `.vscode-oss-dev/extensions/control.json` mapping.
   - Purge `.obsolete`.
4. **Update `scripts/code.bat`**:
   - Ensure proposed APIs `--enable-proposed-api=vscode.universal-ai --enable-proposed-api=custom.universal-ai` are present.
5. **Compile & Verify**:
   - Recompile workbench changes or sync to `out/`.
   - Launch Electron with `run-electron.bat`.
   - Verify with `scripts/get-all-exts.mjs` that `vscode.universal-ai` is present and active.
   - Verify status bar and chat participant.
