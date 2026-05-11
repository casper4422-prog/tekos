import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json(null);
	const membership = await db.tribeMembership.findFirst({
		where: { userId: locals.user.id },
		include: { tribe: { select: { id:true, name:true } } }
	});
	return json(membership?.tribe ?? null);
};
