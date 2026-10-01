# Fix: Universal AI Extension Registration Errors

**Date**: 2026-09-30
**Status**: Applied and Testing

## Root Cause Analysis

Three timing-related bugs where VS Code's extension proposal/vendor registry wasn't fully initialized when extension point handlers fired for built-in extensions.

### Error 1: chatParticipant must be declared in package.json: universal-ai.chat
File: out/vs/workbench/contrib/chat/browser/chatParticipant.contribution.js
Fix: Built-in extensions bypass the proposal enforcement check.

### Error 2: Chat model provider uses UNKNOWN vendor universal-ai
File: out/vs/workbench/contrib/chat/common/languageModels.js
Fix: Auto-register unknown vendors with a warning instead of throwing.

### Error 3: Static agent registration miss  
File: out/vs/workbench/api/browser/mainThreadChatAgents2.js
Fix: Auto-register built-in extension agents when static registration is missing.
