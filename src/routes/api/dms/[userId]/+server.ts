import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ params, locals }) => {
	const uid = locals.user!.id;
	const otherId = parseInt(params.userId);
	const msgs = await db.directMessage.findMany({
		where: { OR: [{ fromUserId: uid, toUserId: otherId }, { fromUserId: otherId, toUserId: uid }] },
		orderBy: { createdAt: 'asc' }
	});
	// mark incoming as read
	await db.directMessage.updateMany({ where: { fromUserId: otherId, toUserId: uid, read: false }, data: { read: true } });
	return json(msgs);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = locals.user!.id;
	const otherId = parseInt(params.userId);
	const { message } = await request.json();
	if (!message?.trim()) return json({ error: 'Empty message' }, { status: 400 });
	const msg = await db.directMessage.create({ data: { fromUserId: uid, toUserId: otherId, message: message.trim() } });
	return json(msg, { status: 201 });
};
