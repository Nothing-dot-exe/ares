# Changelog: Clean UI (Zero Icons) & Dynamic Provider Model Selection

**Date**: 2026-09-30  
**Author**: AI Assistant  
**Task**: Remove all icons/emojis from model names and status bar, and dynamically filter the Chat Model Picker so choosing a provider populates only that provider's models.

---

## 📝 Files Modified

1. **[`extensions/universal-ai/extension.js`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/extensions/universal-ai/extension.js)**
   - **Clean UI (No Icons/Emojis)**:
     - Stripped all emoji prefixes (`⚡`, `👁️`, `🌐`, `🔀`, `💻`) from all model names in `PROVIDERS`.
     - Stripped `$(sparkle)` and `$(zap)` from status bar button: now displays clean text `AI: ${provider}`.
   - **Dynamic Model Selection**:
     - Added `onDidChangeLanguageModelChatInformation` event emitter (`onDidChangeLMInfo`).
     - Updated `provideLanguageModelChatInformation()` to dynamically filter and return only the models belonging to the actively chosen provider (or all models if 'All Providers' selected).
     - In `universal-ai.selectProvider` command:
       - Added option for `All Providers`.
       - Updates `chat.defaultModel` to the selected provider's default model.
       - Fires `onDidChangeLMInfo.fire()` to immediately refresh the Chat Model Picker dropdown (Image 3).

2. **[`scripts/serve-web.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/serve-web.mjs)**
   - Maintained clean server defaults and purged outdated localStorage caches.
