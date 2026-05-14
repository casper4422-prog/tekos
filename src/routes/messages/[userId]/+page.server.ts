import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const uid = locals.user!.id;
	const otherId = parseInt(params.userId);

	const [msgs, other] = await Promise.all([
		db.directMessage.findMany({
			where: { OR: [{ fromUserId: uid, toUserId: otherId }, { fromUserId: otherId, toUserId: uid }] },
			orderBy: { createdAt: 'asc' }
		}),
		db.user.findUnique({ where: { id: otherId }, select: { id:true, nickname:true } })
	]);

	// mark incoming as read
	await db.directMessage.updateMany({ where: { fromUserId: otherId, toUserId: uid, read: false }, data: { read: true } });

	return { messages: msgs, other, myId: uid };
};
