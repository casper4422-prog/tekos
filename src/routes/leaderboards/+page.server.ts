import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async () => {
	const [users, tribes, creatureRows, bossRows, tradeRows] = await Promise.all([
		db.user.findMany({
			select: {
				id:true, nickname:true, email:true, createdAt:true,
				_count: { select: { creatures:true, friendsInitiated:true, bossRecords:true } }
			},
			take: 100
		}),
		db.tribe.findMany({
			include: { _count: { select: { members:true, creatures:true } } },
			orderBy: { members: { _count: 'desc' } }, take: 50
		}),
		db.creature.findMany({
			include: { user: { select: { nickname:true, email:true } } },
			orderBy: { createdAt: 'desc' }, take: 500
		}),
		db.bossRecord.findMany({ select: { userId:true, outcome:true, difficulty:true, bossName:true } }),
		db.trade.findMany({ where: { status: 'closed' }, select: { userId:true } })
	]);

	// Per-user stats
	const bossWins: Record<number,number>   = {};
	const bossAlpha: Record<number,number>  = {};
	const tradesMap: Record<number,number>  = {};

	for (const b of bossRows) {
		if (b.outcome === 'success') {
			bossWins[b.userId] = (bossWins[b.userId] ?? 0) + 1;
			if (b.difficulty === 'alpha') bossAlpha[b.userId] = (bossAlpha[b.userId] ?? 0) + 1;
		}
	}
	for (const t of tradeRows) {
		tradesMap[t.userId] = (tradesMap[t.userId] ?? 0) + 1;
	}

	// Species owned per user
	const speciesOwned: Record<number, Set<string>> = {};
	for (const c of creatureRows) {
		const sp = String((c.data as Record<string,unknown>).species ?? '');
		if (!speciesOwned[c.userId]) speciesOwned[c.userId] = new Set();
		speciesOwned[c.userId].add(sp);
	}

	const players = users
		.map(u => ({
			id: u.id,
			name: u.nickname ?? u.email,
			specimens: u._count.creatures,
			friends: u._count.friendsInitiated,
			bossWins: bossWins[u.id] ?? 0,
			alphaKills: bossAlpha[u.id] ?? 0,
			tradesCompleted: tradesMap[u.id] ?? 0,
			speciesOwned: speciesOwned[u.id]?.size ?? 0,
			score: (u._count.creatures * 2) + ((bossWins[u.id] ?? 0) * 5) + ((bossAlpha[u.id] ?? 0) * 10) + ((tradesMap[u.id] ?? 0) * 3) + ((speciesOwned[u.id]?.size ?? 0) * 1)
		}))
		.sort((a, b) => b.score - a.score)
		.slice(0, 50)
		.map((u, i) => ({ ...u, rank: i + 1 }));

	// Top specimens
	const scoredSpecimens = creatureRows
		.map(c => {
			const d = c.data as Record<string,unknown>;
			const bs = (d.baseStats as Record<string,number>) ?? {};
			const muts = Object.values((d.mutations as Record<string,number>) ?? {}).reduce((a,b) => a+b, 0);
			return {
				id: c.id,
				name: String(d.name ?? 'Unnamed'),
				species: String(d.species ?? '?'),
				level: Number(d.level ?? 1),
				melee: bs.Melee ?? 0,
				health: bs.Health ?? 0,
				weight: bs.Weight ?? 0,
				muts,
				owner: c.user.nickname ?? c.user.email,
				ownerId: c.userId,
				score: (bs.Melee ?? 0) + (bs.Health ?? 0) / 100 + muts * 10
			};
		})
		.sort((a, b) => b.score - a.score)
		.slice(0, 50)
		.map((c, i) => ({ ...c, rank: i + 1 }));

	// Boss legends (most wins)
	const bossLegends = Object.entries(bossWins)
		.map(([uid, wins]) => {
			const u = users.find(x => x.id === parseInt(uid));
			return { id: parseInt(uid), name: u?.nickname ?? u?.email ?? 'Unknown', wins, alphaKills: bossAlpha[parseInt(uid)] ?? 0 };
		})
		.sort((a, b) => b.wins - a.wins || b.alphaKills - a.alphaKills)
		.slice(0, 20)
		.map((x, i) => ({ ...x, rank: i + 1 }));

	return {
		players,
		tribes: tribes.map((t, i) => ({
			rank: i + 1, id: t.id, name: t.name,
			members: t._count.members, specimens: t._count.creatures
		})),
		specimens: scoredSpecimens,
		bossLegends
	};
};
