import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Prisma } from '@prisma/client';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	const { creatureId } = await request.json();
	const membership = await db.tribeMembership.findFirst({ where: { userId: uid } });
	if (!membership) return json({ error: 'Not in a tribe' }, { status: 400 });
	const creature = await db.creature.findFirst({ where: { id: creatureId, userId: uid } });
	if (!creature) return json({ error: 'Creature not found' }, { status: 404 });
	const tc = await db.tribeCreature.create({ data: { tribeId: membership.tribeId, createdByUserId: uid, creatureId, data: (creature.data ?? {}) as Prisma.InputJsonValue } });
	return json(tc, { status: 201 });
};
