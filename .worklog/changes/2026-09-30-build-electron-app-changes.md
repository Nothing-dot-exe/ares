# Changes: Built & Launched Code OSS Electron App

**Date**: 2026-09-30  
**Context**: Built Code OSS desktop from source with Electron runtime, native bindings, and Universal AI provider.

---

## 1. Files Added / Modified
- [`run-electron.bat`](../../run-electron.bat) (Added):
  One-click launcher for the built desktop Electron edition. Cleans old port 8080 servers and old Code processes, unblocks binaries, starts the AI proxy, and invokes `scripts\code.bat`.
- [`product.json`](../../product.json) (Modified):
  Added `custom.universal-ai` to `extensionEnabledApiProposals` to enable proposed chat and language model APIs in the desktop build.
- [`src/vs/base/node/id.ts`](../../src/vs/base/node/id.ts) & [`out/vs/base/node/id.js`](../../out/vs/base/node/id.js) (Modified):
  Moved `await import('@vscode/windows-registry')` inside the `try` block in `getSqmMachineId` to prevent unhandled promise rejections on Windows.
- [`src/vs/platform/policy/node/nativePolicyService.ts`](../../src/vs/platform/policy/node/nativePolicyService.ts) & [`out/vs/platform/policy/node/nativePolicyService.js`](../../out/vs/platform/policy/node/nativePolicyService.js) (Modified):
  Wrapped `@vscode/policy-watcher` import in a `try-catch` to prevent startup crash if enterprise group policy watcher cannot be loaded.
- `.build/electron/` (Downloaded):
  Downloaded Electron 43.7.3 desktop shell via `node build/lib/electron.ts`.
- `out/` (Compiled):
  Transpiled 9,475 TypeScript files and 2,164 static resources from `src/` to `out/` using esbuild via `npm run transpile-client`.
- `node_modules/` (Native bindings copied):
  Copied Windows x64 `.node` prebuilt binaries from installed VS Code into `node_modules/` (`vscode-sqlite3.node`, `spdlog.node`, `vscode-policy-watcher.node`, `winregistry.node`, `iselevated.node`, `conpty.node`, etc.).
- `~/.vscode-oss-dev/extensions` (Populated):
  Copied `universal-ai` and `ms-python` extension suite (`python`, `pylance`, `debugpy`, `python-envs`).
