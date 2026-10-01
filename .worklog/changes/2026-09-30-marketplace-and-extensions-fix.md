# Changes: Extension Loading & Marketplace Installation Enabled

**Date**: 2026-09-30  
**Context**: Enabled Visual Studio Marketplace in `product.json` and populated compiled extension bundles.

---

## 1. Files Modified
- [`product.json`](../../product.json):
  Added `extensionsGallery` connecting Code OSS directly to the official Visual Studio Marketplace:
  ```json
  "extensionsGallery": {
      "nlsBaseUrl": "https://www.vscode-unpkg.net/_lp/",
      "serviceUrl": "https://marketplace.visualstudio.com/_apis/public/gallery",
      "itemUrl": "https://marketplace.visualstudio.com/items",
      "publisherUrl": "https://marketplace.visualstudio.com/publishers",
      "resourceUrlTemplate": "https://{publisher}.vscode-unpkg.net/{publisher}/{name}/{version}/{path}",
      "extensionUrlTemplate": "https://www.vscode-unpkg.net/_gallery/{publisher}/{name}/latest",
      "controlUrl": "https://main.vscode-cdn.net/extensions/marketplace.json"
  }
  ```
- `extensions/` (Built-in extensions populated):
  Populated `out/` and `dist/` directories for all built-in extensions (`git`, `git-base`, `emmet`, `github-authentication`, `markdown-language-features`, `typescript-language-features`, etc.).
- `~/.vscode-oss-dev/extensions/extensions.json`:
  Registered `custom.universal-ai` along with Microsoft Python extensions (`ms-python.python`, `ms-python.vscode-pylance`, `ms-python.debugpy`, `ms-python.vscode-python-envs`).
