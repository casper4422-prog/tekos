import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const [sessions, records, creatureRows] = await Promise.all([
		db.arenaSession.findMany({
			where: { status:'open' }, orderBy: { createdAt:'desc' },
			include: { creator: { select:{ nickname:true, email:true } }, _count:{ select:{ members:true, creatures:true } } }
		}),
		db.bossRecord.findMany({ where: { userId: uid }, orderBy: { createdAt:'desc' }, take:10 }),
		db.creature.findMany({ where: { userId: uid }, select: { id:true, data:true } })
	]);
	return {
		sessions: sessions.map(s => ({ ...s, memberCount: s._count.members, creatureCount: s._count.creatures })),
		records,
		myId: uid,
		myCreatures: creatureRows.map(c => ({ ...c.data as object, id: c.id }))
	};
};
