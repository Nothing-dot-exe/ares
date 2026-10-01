# Change Record: Initial VS Code Web Setup

**Date**: 2026-09-29  
**Author**: Antigravity Assistant

---

### 1. Cloned Repository
- **Action**: Full clone of [microsoft/vscode](https://github.com/microsoft/vscode.git) into root folder.
- **Git Config**: Enabled `core.longpaths = true` to support long Windows paths.

### 2. Created Web Server (`scripts/serve-web.mjs`)
- **File**: [`scripts/serve-web.mjs`](../../scripts/serve-web.mjs)
- **Features**:
  - Serves static build files from `.vscode-test-web/`.
  - Configures dark mode default (`Default Dark Modern`).
  - Sets body styling `#1e1e1e` to eliminate white flash on startup.
  - Handles `EADDRINUSE` gracefully if port 8080 is already active.
  - Disables pre-mounted repository folders in Explorer so it starts clean.

### 3. Created One-Click Runner (`run.bat`)
- **File**: [`run.bat`](../../run.bat)
- **Features**:
  - Runs in current working directory.
  - Verifies Node.js in `PATH`.
  - Downloads assets if missing.
  - Starts server and opens Chrome to `http://localhost:8080/?ew=true`.

### 4. Established Agent Rule Book (`AGENTS.md`)
- **File**: [`AGENTS.md`](../../AGENTS.md)
- **Features**:
  - Requires agents to read `.worklog/CURRENT_STATE.md` on every new conversation.
  - Mandates recording all plans, changes, and debug notes in `.worklog/`.
