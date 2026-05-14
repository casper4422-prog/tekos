import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const sessionId = intParam(params.id);
	const uid = requireUser(locals).id;
	const { creatureId, creatureData } = await request.json();
	const row = await db.arenaCreature.create({ data: { sessionId, userId: uid, creatureId: creatureId ?? null, creatureData } });
	return json(row, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const cid = intParam(params.cid, 'cid');
	const row = await db.arenaCreature.findFirst({ where: { id: cid, userId: requireUser(locals).id } });
	if (!row) return json({ error: 'Not found' }, { status: 404 });
	await db.arenaCreature.delete({ where: { id: cid } });
	return json({ ok: true });
};
