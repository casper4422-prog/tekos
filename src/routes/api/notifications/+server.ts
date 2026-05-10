import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ locals }) => {
	const uid = locals.user!.id;
	const notifs = await db.notification.findMany({ where: { userId: uid }, orderBy: { createdAt: 'desc' }, take: 50 });
	return json(notifs);
};
