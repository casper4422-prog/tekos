import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Fetch latest videos from a YouTube channel RSS feed
// YouTube RSS: https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxxx
// Also supports: https://www.youtube.com/@handle or https://www.youtube.com/channel/UC...

function extractChannelId(input: string): string | null {
	// Direct channel ID
	const directMatch = input.match(/channel\/([UC][a-zA-Z0-9_-]{22,})/);
	if (directMatch) return directMatch[1];
	// Already a bare channel ID
	if (/^[UC][a-zA-Z0-9_-]{22,}$/.test(input.trim())) return input.trim();
	return null;
}

function parseXmlText(xml: string, tag: string): string {
	const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
	return (m?.[1] ?? m?.[2] ?? '').trim();
}

export const GET: RequestHandler = async ({ url }) => {
	const channelUrl = url.searchParams.get('url');
	if (!channelUrl) return json({ error:'url required' }, { status:400 });

	const channelId = extractChannelId(channelUrl);
	if (!channelId) return json({ error:'Could not extract channel ID. Paste the full channel URL (youtube.com/channel/UC...)' }, { status:400 });

	const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
	try {
		const res = await fetch(rssUrl, { signal:AbortSignal.timeout(8000) });
		if (!res.ok) return json({ error:`YouTube RSS returned ${res.status}` }, { status:400 });
		const xml = await res.text();

		const channelName = parseXmlText(xml, 'title').split('\n')[0].trim();
		const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];

		const videos = entries.slice(0, 5).map(entry => {
			const title     = parseXmlText(entry, 'title');
			const videoId   = (entry.match(/yt:videoId>([^<]+)/) ?? [])[1] ?? '';
			const published = parseXmlText(entry, 'published');
			const thumb     = (entry.match(/media:thumbnail url="([^"]+)"/) ?? [])[1] ?? '';
			return { title, link:`https://www.youtube.com/watch?v=${videoId}`, date:published, thumbnail:thumb, type:'youtube', channelName };
		}).filter(v => v.title && v.link.includes('watch'));

		return json({ channelName, channelId, videos });
	} catch (e) {
		return json({ error:'Failed to fetch YouTube RSS' }, { status:500 });
	}
};
