import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const now = Date.now();
	const ONLINE_MS = 5 * 60 * 1000;

	const [rows, incoming, sent] = await Promise.all([
		db.friendship.findMany({
			where: { OR: [{ userId: uid, status: 'accepted' }, { friendUserId: uid, status: 'accepted' }] },
			include: {
				user:   { select: { id:true, email:true, nickname:true, discordName:true, lastSeen:true } },
				friend: { select: { id:true, email:true, nickname:true, discordName:true, lastSeen:true } },
			}
		}),
		db.friendship.findMany({
			where: { friendUserId: uid, status: 'pending' },
			include: { user: { select: { id:true, email:true, nickname:true, discordName:true } } }
		}),
		db.friendship.findMany({
			where: { userId: uid, status: 'pending' },
			include: { friend: { select: { id:true, email:true, nickname:true } } }
		})
	]);

	const friends = rows.map(r => {
		const other = r.userId === uid ? r.friend : r.user;
		const online = other.lastSeen ? (now - new Date(other.lastSeen).getTime()) < ONLINE_MS : false;
		return { id: r.id, friendId: other.id, nickname: other.nickname, email: other.email, discordName: other.discordName, online };
	});

	return {
		friends,
		incoming: incoming.map(r => ({ id: r.id, fromId: r.userId, nickname: r.user.nickname, email: r.user.email, discordName: r.user.discordName })),
		sent: sent.map(r => ({ id: r.id, toId: r.friendUserId, nickname: r.friend.nickname, email: r.friend.email }))
	};
};
