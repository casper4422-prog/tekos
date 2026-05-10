import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

// GET /api/dms — inbox: one row per conversation, latest message
export const GET: RequestHandler = async ({ locals }) => {
	const uid = locals.user!.id;
	const msgs = await db.directMessage.findMany({
		where: { OR: [{ fromUserId: uid }, { toUserId: uid }] },
		orderBy: { createdAt: 'desc' },
		include: {
			fromUser: { select: { id:true, nickname:true, email:true } },
			toUser:   { select: { id:true, nickname:true, email:true } },
		}
	});

	const seen = new Set<number>();
	const convos: Record<string, unknown>[] = [];
	for (const m of msgs) {
		const otherId = m.fromUserId === uid ? m.toUserId : m.fromUserId;
		if (seen.has(otherId)) continue;
		seen.add(otherId);
		const other = m.fromUserId === uid ? m.toUser : m.fromUser;
		const unread = msgs.filter(x => x.fromUserId === otherId && x.toUserId === uid && !x.read).length;
		convos.push({ userId: otherId, nickname: other.nickname, email: other.email, lastMessage: m.message, lastAt: m.createdAt, unread });
	}
	return json(convos);
};
