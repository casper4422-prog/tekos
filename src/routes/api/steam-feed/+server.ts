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

// Steam template var → real CDN. Used by [img]{STEAM_CLAN_IMAGE}/...[/img].
const STEAM_CLAN_CDN = 'https://clan.cloudflare.steamstatic.com/images/';

// GET /api/steam-feed?url=... → returns up to 5 latest ASA announcements
// from the public Steam News API. The `url` query param is accepted but
// ignored in v1 — any saved Steam source resolves to the ASA app feed.
// Future v2 can parse appids / group ids out of the URL.
//
// Steam News API requires no key for this endpoint and is fully public.
// We extract the first image URL from contents (BBCode [img] or HTML <img>)
// and strip BBCode/HTML for a clean card-sized excerpt.
export const GET: RequestHandler = async ({ fetch: serverFetch }) => {
	const apiUrl = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${ASA_APPID}&count=5&maxlength=600&format=json`;
	try {
		const r = await serverFetch(apiUrl);
		if (!r.ok) return json({ items: [] });
		const data = (await r.json()) as SteamNewsResponse;
		const items = (data.appnews?.newsitems ?? []).map(n => ({
			id: `steam-${n.gid}`,
			title: n.title,
			url: n.url,
			body: stripFormatting(n.contents),
			imageUrl: extractFirstImage(n.contents),
			author: n.author || 'Steam',
			feedLabel: n.feedlabel || 'Steam News',
			date: new Date(n.date * 1000).toISOString()
		}));
		return json({ items });
	} catch {
		return json({ items: [] });
	}
};

// Find first image url. Steam announcements use three formats — BBCode [img]…[/img],
// raw HTML <img>, or (newer Community Crunch posts) a bare {STEAM_CLAN_IMAGE}/…png
// dropped inline as plain text. The inline-text variant was the visible bug —
// extract that case here so it renders as a thumbnail instead of leaking text.
function extractFirstImage(raw: string): string | null {
	if (!raw) return null;
	let m = raw.match(/\[img\]\s*([^\[]+?)\s*\[\/img\]/i);
	let url = m?.[1] ?? null;
	if (!url) {
		m = raw.match(/<img[^>]+src=["']([^"']+)["']/i);
		url = m?.[1] ?? null;
	}
	if (!url) {
		m = raw.match(/\{STEAM_CLAN_IMAGE\}\/\S+?\.(?:png|jpe?g|gif|webp)/i);
		url = m?.[0] ?? null;
	}
	if (!url) {
		m = raw.match(/https?:\/\/\S+?\.(?:png|jpe?g|gif|webp)/i);
		url = m?.[0] ?? null;
	}
	if (!url) return null;
	url = url.replace('{STEAM_CLAN_IMAGE}', STEAM_CLAN_CDN);
	return url.trim();
}

// Steam contents come back with a mix of BBCode (`[b]`, `[url=...]X[/url]`, etc.)
// and HTML — strip both, collapse whitespace, trim to a card-friendly length.
// Also strips naked image URLs so they don't pollute the excerpt after the
// thumbnail has been hoisted out.
function stripFormatting(raw: string): string {
	if (!raw) return '';
	let s = raw;
	s = s.replace(/\[\/?[a-zA-Z][^\]]*\]/g, '');
	s = s.replace(/<\/?[a-zA-Z][^>]*>/g, '');
	s = s.replace(/\{STEAM_CLAN_IMAGE\}\/\S+?\.(?:png|jpe?g|gif|webp)/gi, '');
	s = s.replace(/https?:\/\/\S+?\.(?:png|jpe?g|gif|webp)/gi, '');
	s = s.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
	s = s.replace(/\s+/g, ' ').trim();
	if (s.length > 280) s = s.slice(0, 280).trimEnd() + '…';
	return s;
}
