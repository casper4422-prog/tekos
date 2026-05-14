import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const msgs = await db.directMessage.findMany({
		where: { OR: [{ fromUserId: uid }, { toUserId: uid }] },
		orderBy: { createdAt: 'desc' },
		include: {
			fromUser: { select: { id:true, nickname:true, discordName:true } },
			toUser:   { select: { id:true, nickname:true, discordName:true } },
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
		convos.push({ userId: otherId, nickname: other.nickname, discordName: other.discordName, lastMessage: m.message, lastAt: m.createdAt, unread });
	}
	return { convos };
};
