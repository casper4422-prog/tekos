import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// ARK: Survival Ascended app id on Steam.
const ASA_APPID = 2399830;

type SteamNewsItem = {
	gid: string;
	title: string;
	url: string;
	is_external_url?: boolean;
	author?: string;
	contents: string;
	feedlabel?: string;
	date: number;     // unix seconds
	feedname?: string;
	feed_type?: number;
	appid: number;
};

type SteamNewsResponse = {
	appnews?: {
		appid: number;
		newsitems: SteamNewsItem[];
		count: number;
	};
};

// GET /api/steam-feed?url=... → returns up to 5 latest ASA announcements
// from the public Steam News API. The `url` query param is accepted but
// ignored in v1 — any saved Steam source resolves to the ASA app feed.
// Future v2 can parse appids / group ids out of the URL.
//
// Steam News API requires no key for this endpoint and is fully public.
// We strip BBCode/HTML tags from contents for a clean excerpt.
export const GET: RequestHandler = async ({ fetch: serverFetch }) => {
	const apiUrl = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${ASA_APPID}&count=5&maxlength=400&format=json`;
	try {
		const r = await serverFetch(apiUrl);
		if (!r.ok) return json({ items: [] });
		const data = (await r.json()) as SteamNewsResponse;
		const items = (data.appnews?.newsitems ?? []).map(n => ({
			id: `steam-${n.gid}`,
			title: n.title,
			url: n.url,
			body: stripFormatting(n.contents),
			author: n.author || 'Steam',
			feedLabel: n.feedlabel || 'Steam News',
			date: new Date(n.date * 1000).toISOString()
		}));
		return json({ items });
	} catch {
		return json({ items: [] });
	}
};

// Steam contents come back with a mix of BBCode (`[b]`, `[url=...]X[/url]`, etc.)
// and HTML — strip both, collapse whitespace, trim to a card-friendly length.
function stripFormatting(raw: string): string {
	if (!raw) return '';
	let s = raw;
	// BBCode tags
	s = s.replace(/\[\/?[a-zA-Z][^\]]*\]/g, '');
	// HTML tags
	s = s.replace(/<\/?[a-zA-Z][^>]*>/g, '');
	// HTML entities (common ones)
	s = s.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
	// Collapse whitespace
	s = s.replace(/\s+/g, ' ').trim();
	if (s.length > 280) s = s.slice(0, 280).trimEnd() + '…';
	return s;
}
