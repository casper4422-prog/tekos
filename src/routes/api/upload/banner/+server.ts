import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

// POST /api/upload/banner
// Stub implementation: accepts a JSON body { url: string } (a hosted image URL).
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = (await request.json().catch(() => ({}))) as { url?: string };
	const url = typeof body.url === 'string' ? body.url.trim() : '';
	if (!url || url.length > 2048) return json({ error: 'url is required and must be under 2048 characters' }, { status: 400 });
	let parsed: URL;
	try { parsed = new URL(url); } catch { return json({ error: 'Invalid URL' }, { status: 400 }); }
	if (parsed.protocol !== 'https:') return json({ error: 'URL must use HTTPS' }, { status: 400 });
	await db.user.update({ where: { id: locals.user.id }, data: { bannerImage: url } });
	return json({ ok: true, bannerImage: url });
};
