// Test DuckDuckGo Web Search & Web Page Extraction
const query = 'electron ipcRenderer tutorial';

async function searchWeb(query) {
	try {
		const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			}
		});
		const html = await res.text();
		const results = [];
		const regex = /<a class="result__snippet[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
		const titleRegex = /<a class="result__url[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

		// Extract snippets and titles
		const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
		const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

		const links = [];
		let lm;
		while ((lm = linkRegex.exec(html)) !== null && links.length < 6) {
			let rawUrl = lm[1];
			// Unpack duckduckgo redirect if present: //duckduckgo.com/l/?uddg=...
			if (rawUrl.includes('uddg=')) {
				const match = rawUrl.match(/uddg=([^&]+)/);
				if (match) {
					rawUrl = decodeURIComponent(match[1]);
				}
			}
			links.push({
				title: lm[2].replace(/<[^>]+>/g, '').trim(),
				url: rawUrl
			});
		}

		const snippets = [];
		let sm;
		while ((sm = snippetRegex.exec(html)) !== null && snippets.length < 6) {
			snippets.push(sm[1].replace(/<[^>]+>/g, '').trim());
		}

		for (let i = 0; i < links.length; i++) {
			results.push({
				title: links[i].title,
				url: links[i].url,
				snippet: snippets[i] || ''
			});
		}

		return results;
	} catch (e) {
		return `Search error: ${e.message}`;
	}
}

async function fetchPage(url) {
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			}
		});
		const html = await res.text();
		// Strip script, style, nav, footer tags
		let clean = html
			.replace(/<script[\s\S]*?<\/script>/gi, '')
			.replace(/<style[\s\S]*?<\/style>/gi, '')
			.replace(/<nav[\s\S]*?<\/nav>/gi, '')
			.replace(/<footer[\s\S]*?<\/footer>/gi, '')
			.replace(/<[^>]+>/g, ' ')
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/\s+/g, ' ')
			.trim();
		return clean.slice(0, 4000);
	} catch (e) {
		return `Fetch error: ${e.message}`;
	}
}

console.log('Searching for:', query);
const searchResults = await searchWeb(query);
console.log('Results count:', searchResults.length);
if (searchResults.length > 0) {
	console.log('Top Result 1:', searchResults[0]);
	console.log('Fetching first URL:', searchResults[0].url);
	const pageContent = await fetchPage(searchResults[0].url);
	console.log('Page Content preview (first 300 chars):', pageContent.slice(0, 300));
}
