# 2026-10-01: Kill All Servers & Run Fresh Server Environment

## Summary
Resolved user directive to kill all stale servers and run fresh server processes. Modernized process and port termination routines, registered Universal AI in the desktop extension manifest, executed multi-iteration chat stream loop validation (100% pass), and launched both the fresh Ares IDE Native Desktop environment and Code Server.

## Key Changes
1. **Modernized Server Termination** ([`scripts/kill-servers.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/kill-servers.mjs)):
   - Replaced deprecated Windows 11 `wmic` with PowerShell `Get-CimInstance Win32_Process`.
   - Comprehensive termination of old `Ares.exe`, `Code - OSS.exe`, and orphaned node dev/server processes.
   - Scanned and freed ports `8080`, `9888`, `3000`, `5000`, `8081`, and `5870`.

2. **Desktop Extension Synchronization & Registration** ([`scripts/prepare-desktop.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/prepare-desktop.mjs)):
   - Embedded `killAllServers()` invocation into the desktop preparation flow.
   - Automatically injects `vscode.universal-ai` into `~/.vscode-oss-dev/extensions/extensions.json` alongside Python and Pylance extensions, ensuring instant activation and full recognition by the Extension Management Service.

3. **Loop Verification** ([`scripts/test-chat-loop.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/test-chat-loop.mjs)):
   - Executed 18 streaming prompts across 3 loop iterations across Groq, OpenRouter, and NVIDIA NIM.
   - Pass Rate: **18 / 18 (100%)**.

4. **Fresh Server & Desktop Execution**:
   - Started fresh Code Server on `http://localhost:9888` (`--without-connection-token`).
   - Started fresh native Ares IDE Desktop instance (`.build\electron\Ares.exe`) with proposed APIs and zero sign-in blocks.
