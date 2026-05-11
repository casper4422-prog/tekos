import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function parseXmlText(xml: string, tag: string): string {
	const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
	return (m?.[1] ?? m?.[2] ?? '').trim();
}

async function resolveChannelId(input: string): Promise<string | null> {
	const clean = input.trim();

	// Direct channel URL: youtube.com/channel/UCxxx
	const directMatch = clean.match(/channel\/([UC][a-zA-Z0-9_-]{22,})/);
	if (directMatch) return directMatch[1];

	// Bare channel ID pasted directly
	if (/^[UC][a-zA-Z0-9_-]{22,}$/.test(clean)) return clean;

	// @handle URL: youtube.com/@HandleName or just @HandleName
	const handleMatch = clean.match(/@([a-zA-Z0-9_.-]+)/);
	if (handleMatch) {
		const handle = handleMatch[1];
		const pageUrl = `https://www.youtube.com/@${handle}`;
		try {
			const res = await fetch(pageUrl, {
				headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
				signal: AbortSignal.timeout(10000)
			});
			if (res.ok) {
				const html = await res.text();
				// RSS link contains the channel_id
				const rssMatch = html.match(/feeds\/videos\.xml\?channel_id=([UC][a-zA-Z0-9_-]{22,})/);
				if (rssMatch) return rssMatch[1];
				// Fallback: look for externalId in the page JSON
				const extMatch = html.match(/"externalId":"([UC][a-zA-Z0-9_-]{22,})"/);
				if (extMatch) return extMatch[1];
				// Another fallback: browse_id
				const browseMatch = html.match(/"browseId":"([UC][a-zA-Z0-9_-]{22,})"/);
				if (browseMatch) return browseMatch[1];
			}
		} catch {}
		return null;
	}

	// /c/ChannelName or /user/Username — older formats, try fetching
	const legacyMatch = clean.match(/youtube\.com\/(?:c\/|user\/)([a-zA-Z0-9_.-]+)/);
	if (legacyMatch) {
		try {
			const res = await fetch(`https://www.youtube.com/c/${legacyMatch[1]}`, {
				headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
				signal: AbortSignal.timeout(10000)
			});
			if (res.ok) {
				const html = await res.text();
				const rssMatch = html.match(/feeds\/videos\.xml\?channel_id=([UC][a-zA-Z0-9_-]{22,})/);
				if (rssMatch) return rssMatch[1];
			}
		} catch {}
	}

	return null;
}

export const GET: RequestHandler = async ({ url }) => {
	const channelUrl = url.searchParams.get('url');
	if (!channelUrl) return json({ error: 'url parameter required' }, { status: 400 });

	const channelId = await resolveChannelId(channelUrl);
	if (!channelId) {
		return json({ error: 'Could not find YouTube channel. Try using the full channel URL (youtube.com/@handle or youtube.com/channel/UC...)' }, { status: 400 });
	}

	const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
	try {
		const res = await fetch(rssUrl, { signal: AbortSignal.timeout(8000) });
		if (!res.ok) return json({ error: `Could not load RSS feed (${res.status})` }, { status: 400 });

		const xml = await res.text();
		const channelName = parseXmlText(xml, 'title').split('\n')[0].trim();
		const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];

		const videos = entries.slice(0, 5).map(entry => {
			const title   = parseXmlText(entry, 'title');
			const videoId = (entry.match(/yt:videoId>([^<]+)/) ?? [])[1] ?? '';
			const date    = parseXmlText(entry, 'published');
			return {
				title,
				link: `https://www.youtube.com/watch?v=${videoId}`,
				date,
				type: 'youtube',
				channelName
			};
		}).filter(v => v.title && v.link.includes('watch'));

		return json({ channelName, channelId, videos });
	} catch {
		return json({ error: 'Failed to fetch YouTube videos' }, { status: 500 });
	}
};
