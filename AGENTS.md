# VS Code Agents Instructions

This file provides instructions and mandatory rules for AI coding agents working with this codebase.

## 📌 Mandatory Agent Rules: Project Memory & Tracking

Every agent working on this repository **MUST** follow these rules without exception:

1. **Check State First**:
   - Before starting any new task, always read [`.worklog/CURRENT_STATE.md`](.worklog/CURRENT_STATE.md) to understand current progress, active configurations, and pending items.

2. **Record Everything in `.worklog/`**:
   - **Plans (`.worklog/plans/`)**: Document architecture, step-by-step plans, and design choices before starting significant changes.
   - **Changes (`.worklog/changes/`)**: Record every addition, edit, or deletion with file links and descriptions.
   - **Debugging (`.worklog/debugging/`)**: Document any errors, root causes, commands executed, and resolutions.
   - **Current State (`.worklog/CURRENT_STATE.md`)**: Update this master file after completing work to reflect the latest status.

3. **User Communication**:
   - Discuss and get user confirmation before editing source code when requested.
   - Keep entries structured, concise, and linked to modified files.

---

For detailed project overview, architecture, coding guidelines, and validation steps, see the [Copilot Instructions](.github/copilot-instructions.md).

