import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';
import { requireUser } from '$lib/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const uid = requireUser(locals).id;
	const membership = await db.tribeMembership.findFirst({ where: { userId: uid } });
	if (!membership) return json([]);

	const alliances = await db.tribeAlliance.findMany({
		where: { OR: [{ tribe1Id: membership.tribeId }, { tribe2Id: membership.tribeId }] },
		include: {
			tribe1: { select: { id:true, name:true, mainMap:true } },
			tribe2: { select: { id:true, name:true, mainMap:true } },
			requestedBy: { select: { nickname:true } }
		}
	});

	return json(alliances.map(a => ({
		...a,
		partnerTribe: a.tribe1Id === membership.tribeId ? a.tribe2 : a.tribe1,
		isRequester: a.requestedById === uid
	})));
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	const { targetTribeId } = await request.json();
	const membership = await db.tribeMembership.findFirst({ where: { userId: uid, role: { in: ['owner','admin'] } } });
	if (!membership) return json({ error: 'You must be a tribe owner or admin' }, { status: 403 });
	const [t1, t2] = [Math.min(membership.tribeId, targetTribeId), Math.max(membership.tribeId, targetTribeId)];
	const existing = await db.tribeAlliance.findFirst({ where: { tribe1Id: t1, tribe2Id: t2 } });
	if (existing) return json({ error: 'Alliance already exists or pending' }, { status: 409 });
	const alliance = await db.tribeAlliance.create({ data: { tribe1Id: t1, tribe2Id: t2, requestedById: uid, status: 'pending' } });
	// Notify target tribe admins
	const targetAdmins = await db.tribeMembership.findMany({ where: { tribeId: targetTribeId, role: { in: ['owner','admin'] } } });
	const myTribe = await db.tribe.findUnique({ where: { id: membership.tribeId }, select: { name:true } });
	for (const a of targetAdmins) {
		await notify(a.userId, uid, 'alliance_request', { tribeName: myTribe?.name });
	}
	return json(alliance, { status: 201 });
};
