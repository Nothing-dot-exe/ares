# Changes: Live Internet Access for Ares AI (Web Search & Web Page Reader)

## Summary of Changes
Equipped Ares AI with live internet capabilities, enabling the autonomous agent to search the live web for technical documentation, libraries, GitHub repositories, and error solutions, and fetch/read any public web page directly.

## Modified Files
1. **[`src/vs/workbench/contrib/chat/browser/aresAi/aresAiAgent.ts`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/src/vs/workbench/contrib/chat/browser/aresAi/aresAiAgent.ts)**:
   - **`_webSearch(query, token)`**:
     - Connects to DuckDuckGo search endpoint without requiring any API keys.
     - Unpacks redirect URLs and parses search results into structured titles, URLs, and summaries.
     - Formats results as numbered markdown citations for the model.
   - **`_fetchWebPage(url, token)`**:
     - Fetches any public documentation URL or webpage using native `fetch`.
     - Strips script, style, navigation, header, and footer tags.
     - Normalizes HTML entities and whitespace, returning clean markdown text (up to 5,000 characters).
   - **System Prompt & Slash Commands**:
     - Added `web_search` and `fetch_web_page` to `systemPrompt` with usage instructions.
     - Updated `/help` command table to show Live Web Search and Web Page Fetcher.
   - **Tool Parser**:
     - Added `web_search`, `search_web`, `fetch_web_page`, `read_url`, `fetch_page` to `_extractToolCalls`.

2. **[`scripts/test-web-search.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/test-web-search.mjs)**:
   - Verification script testing live search query (`electron ipcRenderer tutorial`) and fetching the top result from `electronjs.org`.

3. **[`scripts/test-agent-tools.mjs`](file:///c:/Users/kadam/OneDrive/Documents/my%20hub/scripts/test-agent-tools.mjs)**:
   - Added unit test cases for XML, bracket, and markdown extraction of `web_search` and `fetch_web_page`.

## GitHub Constraint
- Preserved locally; **NOT pushed to GitHub** per the user's directive.
