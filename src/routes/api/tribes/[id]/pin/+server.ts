import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

// Set the current user's pinned tribe creature. Pass { creatureId: number | null }.
// creatureId must reference a TribeCreature in this tribe (or null to clear).
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = locals.user!.id;
	const tribeId = parseInt(params.id);

	const member = await db.tribeMembership.findFirst({ where: { tribeId, userId: uid } });
	if (!member) return json({ error: 'Not in tribe' }, { status: 403 });

	const body = await request.json().catch(() => ({}));
	const raw = body.creatureId;
	const creatureId = raw === null || raw === undefined ? null : Number(raw);

	if (creatureId !== null) {
		const tc = await db.tribeCreature.findFirst({ where: { id: creatureId, tribeId } });
		if (!tc) return json({ error: 'Creature not in this tribe vault' }, { status: 404 });
	}

	await db.tribeMembership.update({ where: { id: member.id }, data: { pinnedCreatureId: creatureId } });
	return json({ ok: true, pinnedCreatureId: creatureId });
};
