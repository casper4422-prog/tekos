import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

const BOSSES = [
	{ id:'broodmother', name:'Broodmother Lysrix', map:'The Island', difficulties:['gamma','beta','alpha'] },
	{ id:'megapithecus', name:'Megapithecus', map:'The Island', difficulties:['gamma','beta','alpha'] },
	{ id:'dragon', name:'Dragon', map:'The Island', difficulties:['gamma','beta','alpha'] },
	{ id:'overseer', name:'Overseer', map:'The Island', difficulties:['gamma','beta','alpha'] },
	{ id:'manticore', name:'Manticore', map:'Scorched Earth', difficulties:['gamma','beta','alpha'] },
	{ id:'rockwell', name:'Rockwell', map:'Aberration', difficulties:['gamma','beta','alpha'] },
	{ id:'king_titan', name:'King Titan', map:'Extinction', difficulties:['gamma','beta','alpha'] },
	{ id:'master_controller', name:'Master Controller', map:'Genesis 1', difficulties:['gamma','beta','alpha'] },
	{ id:'rockwell_prime', name:'Rockwell Prime', map:'Genesis 2', difficulties:['gamma','beta','alpha'] },
];

export const load: PageServerLoad = async ({ locals }) => {
	const [sessions, records] = await Promise.all([
		db.arenaSession.findMany({
			where: { status:'open' }, orderBy: { createdAt:'desc' },
			include: { creator: { select:{ nickname:true, email:true } }, _count:{ select:{ members:true, creatures:true } } }
		}),
		db.bossRecord.findMany({ where: { userId: locals.user!.id }, orderBy: { createdAt:'desc' }, take:10 })
	]);
	return { bosses: BOSSES, sessions: sessions.map(s => ({ ...s, memberCount: s._count.members, creatureCount: s._count.creatures })), records };
};
