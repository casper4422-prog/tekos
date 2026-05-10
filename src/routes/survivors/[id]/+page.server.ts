import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const targetId = parseInt(params.id);
	const myId = locals.user!.id;

	const [user, creatureRows, friendCount, membership] = await Promise.all([
		db.user.findUnique({
			where: { id: targetId },
			select: { id:true, nickname:true, email:true, discordName:true, bio:true, lookingFor:true, pinnedCreatures:true, createdAt:true, lastSeen:true }
		}),
		db.creature.findMany({ where: { userId: targetId }, select: { id:true, data:true }, orderBy: { createdAt:'desc' } }),
		db.friendship.count({ where: { OR: [{ userId:targetId, status:'accepted' }, { friendUserId:targetId, status:'accepted' }] } }),
		db.tribeMembership.findFirst({ where: { userId:targetId }, include: { tribe: { select: { id:true, name:true } } } })
	]);

	if (!user) error(404, 'Survivor not found');

	const creatures = creatureRows.map(r => ({ ...r.data as object, id: r.id }));
	const pinnedIds = Array.isArray(user.pinnedCreatures) ? user.pinnedCreatures as number[] : [];
	const pinned = pinnedIds.map(id => creatures.find((c: Record<string,unknown>) => (c as Record<string,unknown>).id === id)).filter(Boolean);
	const speciesOwned = new Set(creatures.map((c: Record<string,unknown>) => (c as Record<string,unknown>).species)).size;

	const now = Date.now();
	const isOnline = user.lastSeen ? (now - new Date(user.lastSeen).getTime()) < 5 * 60 * 1000 : false;

	// Check friendship status with viewer
	const friendship = myId !== targetId ? await db.friendship.findFirst({
		where: { OR: [{ userId:myId, friendUserId:targetId }, { userId:targetId, friendUserId:myId }] }
	}) : null;

	return { profile:user, creatures, pinned, friendCount, speciesOwned, tribe:membership?.tribe ?? null, isOnline, friendship, isSelf: myId === targetId };
};
