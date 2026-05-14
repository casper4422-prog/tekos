import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';
import { notify } from '$lib/notify';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = requireUser(locals).id;
	const tribeId = intParam(params.id);

	const { newOwnerUserId } = await request.json().catch(() => ({}));
	if (!newOwnerUserId || typeof newOwnerUserId !== 'number') return json({ error: 'newOwnerUserId required' }, { status: 400 });
	if (newOwnerUserId === uid) return json({ error: 'Cannot transfer ownership to yourself' }, { status: 400 });

	const tribe = await db.tribe.findUnique({ where: { id: tribeId }, select: { ownerUserId: true, name: true } });
	if (!tribe) return json({ error: 'Tribe not found' }, { status: 404 });
	if (tribe.ownerUserId !== uid) return json({ error: 'Only the owner can transfer ownership' }, { status: 403 });

	const newOwnerMembership = await db.tribeMembership.findFirst({ where: { tribeId, userId: newOwnerUserId } });
	if (!newOwnerMembership) return json({ error: 'New owner must be a tribe member' }, { status: 400 });

	await db.$transaction([
		db.tribe.update({ where: { id: tribeId }, data: { ownerUserId: newOwnerUserId } }),
		db.tribeMembership.update({ where: { id: newOwnerMembership.id }, data: { role: 'owner' } }),
		db.tribeMembership.updateMany({ where: { tribeId, userId: uid }, data: { role: 'admin' } }),
		db.tribalActivity.create({ data: { tribeId, userId: uid, eventType: 'ownership_transferred', metadata: { previousOwner: uid, newOwner: newOwnerUserId } } })
	]);

	await notify(newOwnerUserId, uid, 'tribe_ownership_transferred', { tribeName: tribe.name });
	return json({ ok: true });
};
