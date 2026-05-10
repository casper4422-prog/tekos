import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const sessionId = parseInt(params.id);
	const uid = locals.user!.id;
	const { creatureId, creatureData } = await request.json();
	const row = await db.arenaCreature.create({ data: { sessionId, userId: uid, creatureId: creatureId ?? null, creatureData } });
	return json(row, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const cid = parseInt(params.cid);
	const row = await db.arenaCreature.findFirst({ where: { id: cid, userId: locals.user!.id } });
	if (!row) return json({ error: 'Not found' }, { status: 404 });
	await db.arenaCreature.delete({ where: { id: cid } });
	return json({ ok: true });
};
