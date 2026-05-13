import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

// POST /api/tribes/leave-all — remove the signed-in survivor from every tribe they belong to.
// Owned tribes are not dissolved here; we only remove the user's own membership row so they no longer appear as a member.
export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const result = await db.tribeMembership.deleteMany({ where: { userId: locals.user.id } });
	return json({ ok: true, left: result.count });
};
