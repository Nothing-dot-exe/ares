# Plan: Give Live Internet Access to Ares AI (Web Search & Web Page Reader)

## 1. User Request
> "lets give internet acess to ai"

## 2. Requirements & Capabilities
Add two native internet tools to Ares AI's autonomous agent tool suite:
1. **`web_search` (or `search_web`)**:
   - Searches the live web using DuckDuckGo HTML engine.
   - Returns top titles, URLs, and text snippets.
   - Requires zero API keys or external subscriptions.
2. **`fetch_web_page` (or `read_url`)**:
   - Fetches any public URL / documentation page / GitHub content.
   - Strips non-content tags (`<script>`, `<style>`, `<nav>`, `<footer>`).
   - Normalizes HTML entities and whitespace.
   - Returns clean, readable text to the model context.
3. **Autonomous Agent Integration**:
   - Include `web_search` and `fetch_web_page` in the system prompt.
   - Extend `_extractToolCalls` to parse XML, bracket, and markdown tool calls for both tools.
   - Wire results into the ReAct multi-step loop so the model can search, read documentation, and synthesize code solutions in real time.

## 3. Step-by-Step Implementation Plan
1. Update [`src/vs/workbench/contrib/chat/browser/aresAi/aresAiAgent.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/aresAi/aresAiAgent.ts):
   - Add `_webSearch(query, token)` implementation.
   - Add `_fetchWebPage(url, token)` implementation.
   - Update `systemPrompt` to describe both tools.
   - Update `_extractToolCalls` to support `web_search`, `search_web`, `fetch_web_page`, `read_url`.
   - Update slash command `/help` table to show Internet Search & Web Fetching capabilities.
2. Transpile client using `npm run transpile-client`.
3. Create automated test scripts:
   - Verify `web_search` and `fetch_web_page` tool handlers.
4. Record documentation in `.worklog/` (Do NOT push to GitHub).
