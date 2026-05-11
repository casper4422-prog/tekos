import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CACHE_TTL = 30 * 60 * 1000;
let cache: { data: Record<string,unknown>[]; ts: number } | null = null;

const STEAM_URL = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2399830&count=10&maxlength=600&format=json';

export const GET: RequestHandler = async () => {
	if (cache && Date.now() - cache.ts < CACHE_TTL) return json(cache.data);
	try {
		const res = await fetch(STEAM_URL, { headers:{ 'User-Agent':'TekOS/3.0' }, signal:AbortSignal.timeout(8000) });
		if (!res.ok) throw new Error(`Steam API ${res.status}`);
		const data = await res.json();
		const items = (data?.appnews?.newsitems ?? []) as Record<string,unknown>[];
		const parsed = items.map((item: Record<string,unknown>) => ({
			title:       String(item.title ?? ''),
			link:        String(item.url ?? ''),   // ← field is 'link' so template can use n.link
			date:        new Date(Number(item.date) * 1000).toISOString(),
			description: String(item.contents ?? '').replace(/<[^>]+>/g, '').slice(0, 240),
			author:      String(item.author ?? 'Studio Wildcard'),
			type:        'ark_news'
		})).filter((i: Record<string,unknown>) => i.title && i.link);
		cache = { data: parsed, ts: Date.now() };
		return json(parsed);
	} catch {
		return json(cache?.data ?? []);
	}
};
