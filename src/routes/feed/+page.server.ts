import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;

	const friendships = await db.friendship.findMany({
		where: { OR: [{ userId:uid, status:'accepted' }, { friendUserId:uid, status:'accepted' }] }
	});
	const friendIds = friendships.map(f => f.userId === uid ? f.friendUserId : f.userId);
	const networkIds = [...new Set([uid, ...friendIds])];

	const [events, bossRecords, recentTrades] = await Promise.all([
		db.activityEvent.findMany({
			where: { userId: { in: networkIds } },
			orderBy: { createdAt: 'desc' },
			take: 60,
			include: { user: { select: { id:true, nickname:true, email:true } } }
		}),
		db.bossRecord.findMany({
			where: { userId: { in: networkIds } },
			orderBy: { createdAt: 'desc' },
			take: 20,
			include: { user: { select: { id:true, nickname:true, email:true } } }
		}),
		db.trade.findMany({
			where: { userId: { in: networkIds }, status: 'open' },
			orderBy: { createdAt: 'desc' },
			take: 15,
			include: { user: { select: { id:true, nickname:true, email:true } } }
		})
	]);

	return { events, bossRecords, recentTrades, friendCount: friendIds.length };
};
