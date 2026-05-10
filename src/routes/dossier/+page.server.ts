import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [user, creatureRows, friendCount, membership] = await Promise.all([
		db.user.findUnique({
			where: { id: userId },
			select: { id: true, email: true, nickname: true, discordName: true, bio: true, lookingFor: true, pinnedCreatures: true, createdAt: true }
		}),
		db.creature.findMany({ where: { userId }, select: { id: true, data: true } }),
		db.friendship.count({ where: { OR: [{ userId, status: 'accepted' }, { friendUserId: userId, status: 'accepted' }] } }),
		db.tribeMembership.findFirst({ where: { userId }, include: { tribe: { select: { name: true } } } })
	]);

	const creatures = creatureRows.map(r => ({ ...r.data as Record<string, unknown>, id: r.id }));
	const pinnedIds = Array.isArray(user?.pinnedCreatures) ? (user.pinnedCreatures as number[]) : [];
	const pinned = pinnedIds.map(id => creatures.find(c => c.id === id)).filter(Boolean);
	const speciesOwned = new Set(creatures.map((c: Record<string, unknown>) => c.species)).size;

	return {
		profile: user,
		creatures,
		pinned,
		friendCount,
		speciesOwned,
		tribe: membership?.tribe ?? null
	};
};
