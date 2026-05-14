import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

export const GET: RequestHandler = async () => {
	const tribes = await db.tribe.findMany({
		orderBy: { createdAt: 'desc' },
		include: { _count: { select: { members: true } } }
	});
	return json(tribes.map(t => ({ ...t, memberCount: t._count.members })));
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	const { name, description, mainMap } = await request.json();
	if (!name?.trim()) return json({ error: 'Name required' }, { status: 400 });
	if (name.trim().length > 40) return json({ error: 'Tribe name too long (max 40 characters)' }, { status: 400 });
	if (description && description.trim().length > 500) return json({ error: 'Description too long (max 500 characters)' }, { status: 400 });
	const inTribe = await db.tribeMembership.findFirst({ where: { userId: uid } });
	if (inTribe) return json({ error: 'You are already in a tribe' }, { status: 409 });
	try {
		const tribe = await db.tribe.create({ data: { name: name.trim(), description: description?.trim() || null, mainMap: mainMap?.trim() || null, ownerUserId: uid } });
		await db.tribeMembership.create({ data: { tribeId: tribe.id, userId: uid, role: 'owner' } });
		return json(tribe, { status: 201 });
	} catch (e: any) {
		if (e?.code === 'P2002') return json({ error: 'Tribe name already taken' }, { status: 409 });
		throw e;
	}
};
