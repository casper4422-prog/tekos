import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async () => {
	const tribes = await db.tribe.findMany({
		orderBy: { createdAt: 'desc' },
		include: { _count: { select: { members: true } } }
	});
	return json(tribes.map(t => ({ ...t, memberCount: t._count.members })));
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = locals.user!.id;
	const { name, description, mainMap } = await request.json();
	if (!name?.trim()) return json({ error: 'Name required' }, { status: 400 });
	const existing = await db.tribe.findFirst({ where: { name } });
	if (existing) return json({ error: 'Tribe name already taken' }, { status: 409 });
	const inTribe = await db.tribeMembership.findFirst({ where: { userId: uid } });
	if (inTribe) return json({ error: 'You are already in a tribe' }, { status: 409 });
	const tribe = await db.tribe.create({ data: { name: name.trim(), description: description?.trim() || null, mainMap: mainMap?.trim() || null, ownerUserId: uid } });
	await db.tribeMembership.create({ data: { tribeId: tribe.id, userId: uid, role: 'owner' } });
	return json(tribe, { status: 201 });
};
