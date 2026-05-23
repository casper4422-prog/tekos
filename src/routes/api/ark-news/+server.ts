import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CACHE_TTL = 30 * 60 * 1000;
let cache: { data: Record<string,unknown>[]; ts: number } | null = null;

const STEAM_URL = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2399830&count=10&maxlength=600&format=json';

// Steam wraps image URLs three different ways depending on which news pipeline
// generated the item:
//   1. BBCode    [img]{STEAM_CLAN_IMAGE}/path/hash.png[/img]
//   2. HTML      <img src="…">
//   3. Bare text {STEAM_CLAN_IMAGE}/path/hash.png   ← inline, no wrapper
// Newer Community Crunch posts use #3 — the screenshot bug was that #3 wasn't
// matched, so the URL leaked into the excerpt text and no image rendered.
const STEAM_CLAN_CDN = 'https://clan.cloudflare.steamstatic.com/images/';
const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp)/i;
function extractFirstImage(raw: string): string | null {
	if (!raw) return null;
	let m = raw.match(/\[img\]\s*([^\[]+?)\s*\[\/img\]/i);
	let url = m?.[1] ?? null;
	if (!url) {
		m = raw.match(/<img[^>]+src=["']([^"']+)["']/i);
		url = m?.[1] ?? null;
	}
	if (!url) {
		// Inline Steam template placeholder ending in an image extension
		m = raw.match(/\{STEAM_CLAN_IMAGE\}\/\S+?\.(?:png|jpe?g|gif|webp)/i);
		url = m?.[0] ?? null;
	}
	if (!url) {
		// Bare http(s) URL ending in an image extension
		m = raw.match(/https?:\/\/\S+?\.(?:png|jpe?g|gif|webp)/i);
		url = m?.[0] ?? null;
	}
	if (!url) return null;
	url = url.replace('{STEAM_CLAN_IMAGE}', STEAM_CLAN_CDN);
	return url.trim();
}
function stripFormatting(raw: string): string {
	if (!raw) return '';
	let s = raw;
	s = s.replace(/\[\/?[a-zA-Z][^\]]*\]/g, '');  // BBCode tags
	s = s.replace(/<\/?[a-zA-Z][^>]*>/g, '');     // HTML tags
	// Naked image URLs (post-tag-strip) — otherwise they pollute the excerpt
	s = s.replace(/\{STEAM_CLAN_IMAGE\}\/\S+?\.(?:png|jpe?g|gif|webp)/gi, '');
	s = s.replace(/https?:\/\/\S+?\.(?:png|jpe?g|gif|webp)/gi, '');
	s = s.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
	s = s.replace(/\s+/g, ' ').trim();
	return s;
}
// Keep IMAGE_EXT around for explicit reference; the regexes above are equivalent inlined.
void IMAGE_EXT;

export const GET: RequestHandler = async () => {
	if (cache && Date.now() - cache.ts < CACHE_TTL) return json(cache.data);
	try {
		const res = await fetch(STEAM_URL, { headers:{ 'User-Agent':'TekOS/3.0' }, signal:AbortSignal.timeout(8000) });
		if (!res.ok) throw new Error(`Steam API ${res.status}`);
		const data = await res.json();
		const items = (data?.appnews?.newsitems ?? []) as Record<string,unknown>[];
		const parsed = items.map((item: Record<string,unknown>) => {
			const rawContents = String(item.contents ?? '');
			const cleaned = stripFormatting(rawContents);
			return {
				title:       String(item.title ?? ''),
				link:        String(item.url ?? ''),   // ← field is 'link' so template can use n.link
				date:        new Date(Number(item.date) * 1000).toISOString(),
				description: cleaned.slice(0, 240),
				imageUrl:    extractFirstImage(rawContents),
				author:      String(item.author ?? 'Studio Wildcard'),
				type:        'ark_news'
			};
		}).filter((i: Record<string,unknown>) => i.title && i.link);
		cache = { data: parsed, ts: Date.now() };
		return json(parsed);
	} catch {
		return json(cache?.data ?? []);
	}
};
