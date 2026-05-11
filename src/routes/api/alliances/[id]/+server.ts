import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const uid = locals.user!.id;
	const id = parseInt(params.id);
	const { action } = await request.json();
	const membership = await db.tribeMembership.findFirst({ where: { userId: uid, role: { in: ['owner','admin'] } } });
	if (!membership) return json({ error: 'Unauthorized' }, { status: 403 });
	const alliance = await db.tribeAlliance.findFirst({ where: { id, OR: [{ tribe1Id: membership.tribeId }, { tribe2Id: membership.tribeId }] } });
	if (!alliance) return json({ error: 'Not found' }, { status: 404 });
	if (action === 'accept') {
		await db.tribeAlliance.update({ where: { id }, data: { status: 'accepted' } });
		await notify(alliance.requestedById, uid, 'alliance_accepted', {});
	} else {
		await db.tribeAlliance.delete({ where: { id } });
	}
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const uid = locals.user!.id;
	const id = parseInt(params.id);
	const membership = await db.tribeMembership.findFirst({ where: { userId: uid, role: { in: ['owner','admin'] } } });
	if (!membership) return json({ error: 'Unauthorized' }, { status: 403 });
	await db.tribeAlliance.deleteMany({ where: { id, OR: [{ tribe1Id: membership.tribeId }, { tribe2Id: membership.tribeId }] } });
	return json({ ok: true });
};
