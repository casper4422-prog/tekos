import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';

export const PUT: RequestHandler = async ({ params, locals }) => {
	await db.notification.updateMany({ where: { id: intParam(params.id), userId: requireUser(locals).id }, data: { read: true } });
	return json({ ok: true });
};
