import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;

	const membership = await db.tribeMembership.findFirst({
		where: { userId: uid },
		include: {
			tribe: {
				include: {
					members: {
						include: { user: { select: { id:true, nickname:true, discordName:true, lastSeen:true } } },
						orderBy: { role: 'asc' }
					},
					creatures: { include: { creator: { select: { id:true, nickname:true, discordName:true } } }, orderBy: { createdAt: 'desc' } },
					joinRequests: {
						where: { status: 'pending' },
						include: { user: { select: { id:true, nickname:true, discordName:true } } }
					}
				}
			}
		}
	});

	let activity: unknown[] = [];
	let warRooms: unknown[] = [];
	if (membership) {
		const tribeId = membership.tribe.id;
		[activity, warRooms] = await Promise.all([
			db.tribalActivity.findMany({
				where: { tribeId },
				orderBy: { createdAt: 'desc' },
				take: 30,
				include: { user: { select: { id:true, nickname:true, discordName:true } } }
			}),
			db.warRoom.findMany({
				where: { tribeId, status: { in: ['scheduled','in_progress'] } },
				orderBy: { scheduledAt: 'asc' },
				include: { createdBy: { select: { id:true, nickname:true, discordName:true } } }
			})
		]);
	}

	const allTribes = membership ? null : await db.tribe.findMany({
		orderBy: { createdAt: 'desc' },
		include: { _count: { select: { members: true } } }
	});

	return { membership, myId: uid, allTribes, activity, warRooms };
};
