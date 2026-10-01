# Plan & Proposal: Model Section Redesign & Optimization

**Date**: 2026-09-29  
**Status**: Proposal / Pending Confirmation (Zero code modifications made)  
**Objective**: Redesign the chat model section, organize providers, eliminate phantom Copilot "Upgrade" placeholders, and elevate the best free models to top-level.

---

## 1. Current State & UX Issues (from User Screenshot)

1. **Phantom Copilot Up-Sell Clutter**:
   - The dropdown displays dummy entries (`Claude Haiku 4.5 [Upgrade]`, `Claude Sonnet 4.6 [Upgrade]`, `GPT-5.6 Terra [Upgrade]`).
   - These are Copilot marketing placeholders that push actual free working models into the collapsed `> Other Models` submenu.

2. **Hidden Flagship Models**:
   - High-performance models like **Groq `openai/gpt-oss-120b`** (500+ tokens/sec, 128k context) are relegated to `> Other Models`.
   - Users must drill into submenus to find Groq, OpenRouter, and Local Ollama.

3. **Lack of Metadata & Provider Context**:
   - Model names in the list don't clearly state context window (e.g., `128k`), speed tier (`⚡ Instant`), or specialized capabilities (`👁️ Vision`, `🧠 Reasoning`).

---

## 2. Proposed Redesign Pillars

### Pillar A: Remove/Hide Phantom "Upgrade" Models
- In VS Code's `product.json` / workbench configuration:
  - Disable Copilot default mock models / up-sell suggestions.
  - Ensure 100% of the dropdown is dedicated to your active Universal AI models.

### Pillar B: Elevate & Pin Top-Tier Models
Configure default pinned models in VS Code settings so the top list instantly presents the best option from each category:
1. ⚡ **GPT-OSS 120B (Groq)** — *Flagship Free Coding & Reasoning (128k)*
2. 👁️ **Llama 3.2 11B Vision (NVIDIA)** — *Vision & Multimodal Free (128k)*
3. ⚡ **Qwen 3.8 27B (Groq)** — *Fast Multilingual Coding (128k)*
4. 🌐 **LFM 2.5 2.6B (OpenRouter)** — *Free Lightweight Chat (32k)*
5. 🔀 **Best Coding (OmniRoute)** — *Multi-Gateway Auto-Router*
6. 💻 **Qwen 2.5 Coder (Local Ollama)** — *100% Offline & Private*

### Pillar C: Clear Naming & Feature Badges
Refine the display names registered in `vscode.lm` to be instantly informative:
- `⚡ GPT-OSS 120B (Groq) · 128k · Free`
- `⚡ Qwen 3.8 27B (Groq) · 128k · Free`
- `👁️ Llama 3.2 11B Vision (NVIDIA) · 128k`
- `🌐 LFM 2.5 2.6B (OpenRouter) · Free`
- `🔀 Best Coding (OmniRoute Gateway)`
- `💻 Qwen 2.5 Coder (Local Ollama · Offline)`

### Pillar D: Dedicated QuickPick Provider Switcher
- Clicking the status bar item `$(sparkle) AI: <Provider>` opens a rich modal with:
  - Provider health & latency indicator.
  - Active API key status (configured / ready).
  - One-click model switching that updates both the widget and the status bar.

---

## 3. Next Steps (Awaiting User Review)
- Review proposed model lineup and layout.
- Confirm whether to suppress the Copilot `[Upgrade]` placeholders.
- No code will be touched until explicitly instructed.
