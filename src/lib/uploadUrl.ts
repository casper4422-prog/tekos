import { json } from '@sveltejs/kit';

// Returns { url } on success, or a Response carrying the validation error (caller should return it as-is).
export async function parseImageUrl(request: Request): Promise<{ url: string } | Response> {
	const body = (await request.json().catch(() => ({}))) as { url?: string };
	const url = typeof body.url === 'string' ? body.url.trim() : '';
	if (!url || url.length > 2048) return json({ error: 'url is required and must be under 2048 characters' }, { status: 400 });
	let parsed: URL;
	try { parsed = new URL(url); } catch { return json({ error: 'Invalid URL' }, { status: 400 }); }
	if (parsed.protocol !== 'https:') return json({ error: 'URL must use HTTPS' }, { status: 400 });
	return { url };
}
