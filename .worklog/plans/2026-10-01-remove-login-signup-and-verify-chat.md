# Plan: Complete Removal of Login/Signup Prompts & AI Chat Verification

## Goal
Completely eradicate all remaining sign-in, login, signup, and setup modals, prompts, headers, and views across Ares IDE while preserving 100% original AI models under Universal AI (`@ai`, `vendor: "universal-ai"`). Validate full chat loop functionality across all active models and endpoints.

---

## Root Cause Analysis
1. **`ChatEntitlementService` (`chatEntitlementService.ts`)**:
   - `get entitlement()` defaults to `ChatEntitlement.Unknown` or `Unresolved` when GitHub Copilot accounts/tokens are absent.
   - Context key `ChatContextKeys.Entitlement.signedOut` was evaluated to `true`.
   - Context key `ChatContextKeys.Setup.completed` was evaluated to `false`.
   - This causes title bar "Sign In" actions, accounts context menu items ("Sign in to use GitHub Copilot..."), and model picker to think setup/sign-in is required.
2. **`ChatSetupRunner` (`chatSetupRunner.ts`)**:
   - `showDialog()` opens `ChatSetupDialog` ("Sign in to use GitHub Copilot" / "Start using AI Features").
   - `doRun()` falls back to `showDialog()` when `setupStrategy` is not specified.
3. **`ChatSetupController` (`chatSetupController.ts`)**:
   - `doSetup()` checks `entitlement === ChatEntitlement.Unknown` and triggers `this.signIn()`, and on failure prompts modal `unknownSignInError` ("Failed to sign in... You must be signed in to use AI features").
4. **`ModelPickerPresentation` & `ModelPickerItemSections`**:
   - `modelPickerRequiresSetup()` evaluates to `true` when user is considered signed out with no BYOK models, which injects `SETUP_REQUIRED_SIGN_IN_ACTION_ID` ("Sign in to use Copilot...").
5. **`WelcomeGettingStartedContent` (`gettingStartedContent.ts`)**:
   - Walkthrough steps include Copilot sign-in and setup steps referencing `workbench.action.chat.triggerSetup`.
6. **`StartupPage` (`startupPage.ts`)**:
   - `tryShowOnboarding()` can trigger experimental onboarding variation containing Copilot sign-in prompts.

---

## Action Plan
1. **Neutralize Entitlement Service (`src/vs/workbench/services/chat/common/chatEntitlementService.ts`)**:
   - Hardwire `get entitlement(): ChatEntitlement` to return `ChatEntitlement.Pro`.
   - In `ChatEntitlementContext`:
     - Default state initialized with `entitlement: ChatEntitlement.Pro`, `completed: true`, `installed: true`, `registered: true`.
     - In `updateContextSync()`: force `signedOutContextKey.set(false)`, `canSignUpContextKey.set(false)`, `proContextKey.set(true)`, `completedContext.set(true)`.
   - In `ChatEntitlementRequests`:
     - Short-circuit `signIn()` to return `{ entitlements: { entitlement: ChatEntitlement.Pro } }`.
     - Short-circuit `signUpFree()` to return `true`.
     - Neutralize error prompts (`onUnknownSignUpError`, `onUnprocessableSignUpError`).
2. **Neutralize Chat Setup Runner & Controller**:
   - In `chatSetupRunner.ts`:
     - Make `showDialog()` immediately return `ChatSetupStrategy.DefaultSetup` without opening `ChatSetupDialog`.
     - Make `doRun()` always use `ChatSetupStrategy.DefaultSetup`, skip dialog, and succeed cleanly.
   - In `chatSetupController.ts`:
     - In `doSetup()`, bypass `signIn` and `signUpFree()`.
     - Return `{ success: true }`.
3. **Neutralize Model Picker Prompts**:
   - In `modelPickerPresentation.ts`: make `modelPickerRequiresSetup` return `false`.
   - In `modelPickerItemSections.ts`: ensure `setupRequired` returns `undefined` (never injects Sign in header or action).
   - In `modelPickerActionItem.ts`: remove `setupRequired` hover text.
4. **Eliminate Sign-in Actions from Title Bar & Accounts**:
   - In `chatSetupContributions.ts`: disable menus for `ChatSetupFromAccountsAction` and `ChatSetupSignInTitleBarAction`.
5. **Clean Getting Started & Onboarding**:
   - In `gettingStartedContent.ts`: replace Copilot setup walkthrough steps with a clean "Chat with AI" step that directly opens chat (`workbench.action.chat.open`).
   - In `startupPage.ts`: disable `tryShowOnboarding()`.
6. **Verify AI Chat in Continuous Loop**:
   - Run multi-iteration test loop using `scripts/test-chat-loop.mjs` verifying Groq (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`), OpenRouter (`liquid/lfm-2.5-2.6b:free`, `nvidia/nemotron-3.5-lightning:free`), and NVIDIA NIM.
7. **Build & Desktop Sync**:
   - Run compilation / desktop preparation.
   - Update `.worklog/CURRENT_STATE.md` and `.worklog/changes/`.
