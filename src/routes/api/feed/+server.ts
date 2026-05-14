import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const uid = requireUser(locals).id;

	// Get friend IDs
	const friendships = await db.friendship.findMany({
		where: { OR: [{ userId:uid, status:'accepted' }, { friendUserId:uid, status:'accepted' }] }
	});
	const friendIds = friendships.map(f => f.userId === uid ? f.friendUserId : f.userId);
	const networkIds = [...new Set([uid, ...friendIds])];

	const events = await db.activityEvent.findMany({
		where: { userId: { in: networkIds } },
		orderBy: { createdAt: 'desc' },
		take: 60,
		include: { user: { select: { id:true, nickname:true } } }
	});

	return json(events);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	const { type, data } = await request.json();
	const event = await db.activityEvent.create({ data: { userId:uid, type, data: data ?? {} } });
	return json(event, { status: 201 });
};
