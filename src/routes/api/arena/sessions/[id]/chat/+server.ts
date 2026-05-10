import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
	const msgs = await db.arenaChat.findMany({
		where: { sessionId: parseInt(params.id) },
		orderBy: { createdAt: 'asc' }, take: 200,
		include: { user: { select: { nickname:true, email:true } } }
	});
	return json(msgs);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = locals.user!.id;
	const { content, messageType } = await request.json();
	const msg = await db.arenaChat.create({ data: { sessionId: parseInt(params.id), userId: uid, content, messageType: messageType ?? 'text' } });
	return json(msg, { status: 201 });
};
