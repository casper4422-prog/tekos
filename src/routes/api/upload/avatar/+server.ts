import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

// POST /api/upload/avatar
// Stub implementation: accepts a JSON body { url: string } (a hosted image URL).
// File-blob uploads can be wired in later — this lets the Settings UI save a pasted URL today.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = (await request.json().catch(() => ({}))) as { url?: string };
	const url = typeof body.url === 'string' ? body.url.trim() : '';
	if (!url) return json({ error: 'url is required' }, { status: 400 });
	await db.user.update({ where: { id: locals.user.id }, data: { avatarImage: url } });
	return json({ ok: true, avatarImage: url });
};
