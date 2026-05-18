import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { parseImageUrl } from '$lib/uploadUrl';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const result = await parseImageUrl(request);
	if (result instanceof Response) return result;
	await db.user.update({ where: { id: locals.user.id }, data: { bannerImage: result.url } });
	return json({ ok: true, bannerImage: result.url });
};
