import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
let cache: { data: Record<string,unknown>[]; ts: number } | null = null;

// ARK Community Crunch RSS — official Wildcard/Studio feed
const RSS_URL = 'https://survivetheark.com/index.php?/forums/forum/5-community-crunch/&type=rss';

function parseRSSItem(xml: string, tag: string): string {
	const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
	return (m?.[1] ?? m?.[2] ?? '').trim();
}

export const GET: RequestHandler = async () => {
	if (cache && Date.now() - cache.ts < CACHE_TTL) return json(cache.data);

	try {
		const res = await fetch(RSS_URL, {
			headers: { 'User-Agent': 'TekOS ARK Companion/3.0' },
			signal: AbortSignal.timeout(6000)
		});
		if (!res.ok) throw new Error('RSS fetch failed');
		const xml = await res.text();

		const items: Record<string,unknown>[] = [];
		const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
		for (const item of itemMatches.slice(0, 8)) {
			const title = parseRSSItem(item, 'title');
			const link  = parseRSSItem(item, 'link');
			const date  = parseRSSItem(item, 'pubDate');
			const desc  = parseRSSItem(item, 'description').replace(/<[^>]+>/g, '').slice(0, 200);
			if (title) items.push({ title, link, date, description: desc, type: 'ark_news' });
		}
		cache = { data: items, ts: Date.now() };
		return json(items);
	} catch {
		return json(cache?.data ?? []);
	}
};
