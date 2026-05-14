import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { intParam } from '$lib/params';

export const GET: RequestHandler = async ({ params }) => {
	const id = intParam(params.id);
	const session = await db.arenaSession.findUnique({
		where: { id },
		include: {
			creator: { select: { id:true, nickname:true } },
			members: { include: { user: { select: { id:true, nickname:true } } } },
			creatures: { include: { user: { select: { nickname:true } } } },
			chats: { include: { user: { select: { nickname:true } } }, orderBy: { createdAt: 'asc' }, take: 100 }
		}
	});
	if (!session) return json({ error: 'Not found' }, { status: 404 });
	return json(session);
};
