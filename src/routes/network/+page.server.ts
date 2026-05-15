import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const now = Date.now();
	const ONLINE_MS = 5 * 60 * 1000;

	const [rows, incoming, sent, myMembership] = await Promise.all([
		db.friendship.findMany({
			where: { OR: [{ userId: uid, status: 'accepted' }, { friendUserId: uid, status: 'accepted' }] },
			include: {
				user:   { select: { id:true, nickname:true, discordName:true, lastSeen:true } },
				friend: { select: { id:true, nickname:true, discordName:true, lastSeen:true } },
			}
		}),
		db.friendship.findMany({
			where: { friendUserId: uid, status: 'pending' },
			include: { user: { select: { id:true, nickname:true, discordName:true } } }
		}),
		db.friendship.findMany({
			where: { userId: uid, status: 'pending' },
			include: { friend: { select: { id:true, nickname:true, discordName:true } } }
		}),
		db.tribeMembership.findFirst({
			where: { userId: uid, role: { in: ['owner','officer','member'] } },
			include: { tribe: { select: { id:true, name:true } } }
		})
	]);

	const friendIds = rows.map(r => r.userId === uid ? r.friendUserId : r.userId);

	const counts = friendIds.length > 0 ? await db.creature.groupBy({
		by: ['userId'],
		where: { userId: { in: friendIds } },
		_count: { id: true }
	}) : [];
	const countByUser = new Map(counts.map(c => [c.userId, c._count.id]));

	const friends = rows.map(r => {
		const other = r.userId === uid ? r.friend : r.user;
		const online = other.lastSeen ? (now - new Date(other.lastSeen).getTime()) < ONLINE_MS : false;
		return {
			id: r.id, friendId: other.id, nickname: other.nickname,
			discordName: other.discordName, online,
			specimenCount: countByUser.get(other.id) ?? 0
		};
	});

	const excludedIds = new Set<number>([uid, ...rows.map(r => r.userId === uid ? r.friendUserId : r.userId)]);
	for (const r of incoming) excludedIds.add(r.userId);
	for (const r of sent) excludedIds.add(r.friendUserId);
	const candidatesRaw = await db.user.findMany({
		where: { id: { notIn: Array.from(excludedIds) } },
		select: { id:true, nickname:true, discordName:true, lastSeen:true },
		orderBy: { lastSeen: 'desc' },
		take: 6
	});
	const suggested = candidatesRaw.map(u => ({
		id: u.id, nickname: u.nickname, discordName: u.discordName,
		online: u.lastSeen ? (now - new Date(u.lastSeen).getTime()) < ONLINE_MS : false
	}));

	return {
		friends,
		incoming: incoming.map(r => ({ id: r.id, fromId: r.userId, nickname: r.user.nickname, discordName: r.user.discordName })),
		sent: sent.map(r => ({ id: r.id, toId: r.friendUserId, nickname: r.friend.nickname, discordName: r.friend.discordName })),
		suggested,
		myTribe: myMembership?.tribe ?? null
	};
};
