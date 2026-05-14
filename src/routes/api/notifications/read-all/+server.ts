import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

export const PUT: RequestHandler = async ({ locals }) => {
	await db.notification.updateMany({ where: { userId: requireUser(locals).id, read: false }, data: { read: true } });
	return json({ ok: true });
};
