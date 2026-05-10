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
						include: { user: { select: { id:true, nickname:true, email:true, lastSeen:true } } },
						orderBy: { role: 'asc' }
					},
					creatures: { include: { creator: { select: { nickname:true, email:true } } }, orderBy: { createdAt: 'desc' } },
					joinRequests: {
						where: { status: 'pending' },
						include: { user: { select: { id:true, nickname:true, email:true } } }
					}
				}
			}
		}
	});

	const allTribes = membership ? null : await db.tribe.findMany({
		orderBy: { createdAt: 'desc' },
		include: { _count: { select: { members: true } } }
	});

	return { membership, myId: uid, allTribes };
};
