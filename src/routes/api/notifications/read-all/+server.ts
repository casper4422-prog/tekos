import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const PUT: RequestHandler = async ({ locals }) => {
	await db.notification.updateMany({ where: { userId: locals.user!.id, read: false }, data: { read: true } });
	return json({ ok: true });
};
