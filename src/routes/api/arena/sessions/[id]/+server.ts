import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	const session = await db.arenaSession.findUnique({
		where: { id },
		include: {
			creator: { select: { id:true, nickname:true, email:true } },
			members: { include: { user: { select: { id:true, nickname:true, email:true } } } },
			creatures: { include: { user: { select: { nickname:true, email:true } } } },
			chats: { include: { user: { select: { nickname:true, email:true } } }, orderBy: { createdAt: 'asc' }, take: 100 }
		}
	});
	if (!session) return json({ error: 'Not found' }, { status: 404 });
	return json(session);
};
