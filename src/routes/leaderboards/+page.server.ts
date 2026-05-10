import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async () => {
	const [users, tribes, creatures] = await Promise.all([
		db.user.findMany({ select:{ id:true, nickname:true, email:true, _count:{ select:{ creatures:true, friendsInitiated:true } } }, orderBy:{ creatures:{ _count:'desc' } }, take:50 }),
		db.tribe.findMany({ include:{ _count:{ select:{ members:true, creatures:true } } }, orderBy:{ members:{ _count:'desc' } }, take:50 }),
		db.creature.findMany({ include:{ user:{ select:{ nickname:true, email:true } } }, orderBy:{ createdAt:'desc' }, take:300 })
	]);

	const scoredCreatures = creatures
		.map(c => {
			const d = c.data as Record<string,unknown>;
			const bs = (d.baseStats as Record<string,number>) ?? {};
			const muts = Object.values((d.mutations as Record<string,number>) ?? {}).reduce((a,b) => a+b, 0);
			return { id:c.id, name:String(d.name??'Unnamed'), species:String(d.species??'?'), level:Number(d.level??1), melee:bs.Melee??0, health:bs.Health??0, muts, owner: c.user.nickname ?? c.user.email };
		})
		.sort((a,b) => (b.melee + b.health/100 + b.muts*10) - (a.melee + a.health/100 + a.muts*10))
		.slice(0,50).map((c,i) => ({ ...c, rank:i+1 }));

	return {
		players: users.map((u,i) => ({ rank:i+1, id:u.id, name:u.nickname??u.email, specimens:u._count.creatures, friends:u._count.friendsInitiated })),
		tribes:  tribes.map((t,i) => ({ rank:i+1, id:t.id, name:t.name, members:t._count.members, specimens:t._count.creatures })),
		specimens: scoredCreatures
	};
};
