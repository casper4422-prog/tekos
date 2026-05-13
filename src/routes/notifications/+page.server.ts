import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;

	const notifs = await db.notification.findMany({
		where: { userId: uid },
		orderBy: { createdAt: 'desc' },
		take: 50
	});

	// Find the nearest upcoming War Room across all tribes the user belongs to.
	// Used by the boss countdown chip on relevant notifications. If none exists,
	// the chip is hidden.
	const memberships = await db.tribeMembership.findMany({
		where: { userId: uid },
		select: { tribeId: true }
	});
	const tribeIds = memberships.map(m => m.tribeId);

	let nextWarRoom: { id: number; bossName: string; scheduledAt: string; tribeId: number; tribeName: string | null } | null = null;
	if (tribeIds.length > 0) {
		const room = await db.warRoom.findFirst({
			where: {
				tribeId: { in: tribeIds },
				status: { in: ['scheduled', 'in_progress'] },
				scheduledAt: { gte: new Date() }
			},
			orderBy: { scheduledAt: 'asc' },
			include: { tribe: { select: { name: true } } }
		});
		if (room) {
			nextWarRoom = {
				id: room.id,
				bossName: room.bossName,
				scheduledAt: room.scheduledAt.toISOString(),
				tribeId: room.tribeId,
				tribeName: room.tribe?.name ?? null
			};
		}
	}

	return { notifs, nextWarRoom };
};
