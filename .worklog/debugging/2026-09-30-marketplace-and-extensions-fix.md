# Debugging Log: Extensions Not Loading / Not Installing in Electron App

**Date**: 2026-09-30  
**Context**: Fixing extension loading and marketplace extension installation in Code OSS Electron desktop edition.

---

## 1. Problem: "Extension not loading or not installing"
- **User Symptom**: The user reported that in the built Electron app, extensions were not loading and could not be installed.

---

## 2. Root Cause Analysis
1. **Marketplace Disabled**:
   - `product.json` in open-source checkouts lacks the `"extensionsGallery"` endpoint configuration.
   - Without `extensionsGallery`, the Extensions view (`Ctrl+Shift+X`) cannot query the Visual Studio Marketplace, and installing any extension from the UI or CLI fails with no gallery service configured.
2. **Missing Built-in Extension Compiled Bundles**:
   - Core built-in extensions (`git`, `git-base`, `github-authentication`, `emmet`, etc.) in `extensions/` required compiled output directories (`out/` and `dist/`).
3. **Missing Registered User Extensions**:
   - The user extension directory (`~/.vscode-oss-dev/extensions/extensions.json`) needed to register the Python extension suite and Universal AI so the extension host activates them.

---

## 3. Resolutions Applied
1. **Added Visual Studio Marketplace Gallery to `product.json`**:
   - Configured `serviceUrl: "https://marketplace.visualstudio.com/_apis/public/gallery"`
   - Configured `itemUrl: "https://marketplace.visualstudio.com/items"`
   - Configured `resourceUrlTemplate: "https://{publisher}.vscode-unpkg.net/{publisher}/{name}/{version}/{path}"`
   - Configured `controlUrl: "https://main.vscode-cdn.net/extensions/marketplace.json"`
2. **Synchronized Compiled Built-in Extensions**:
   - Copied precompiled `out/` and `dist/` bundles from installed VS Code into `extensions/` for all built-in extensions (`git`, `git-base`, `emmet`, `github-authentication`, `markdown-language-features`, `typescript-language-features`, etc.).
3. **Registered Python & Universal AI in User Extensions Directory**:
   - Updated `~/.vscode-oss-dev/extensions/extensions.json` with `custom.universal-ai`, `ms-python.python`, `ms-python.vscode-pylance`, `ms-python.debugpy`, and `ms-python.vscode-python-envs`.
4. **Verified Live**:
   - Electron launcher now reports `[marketplace]` connectivity and initializes all extensions without activation errors.
