import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';

export const GET: RequestHandler = async ({ params }) => {
	const id = intParam(params.id);
	const tribe = await db.tribe.findUnique({
		where: { id },
		include: {
			members: { include: { user: { select: { id:true, nickname:true, lastSeen:true } } }, orderBy: { role: 'asc' } },
			_count: { select: { members: true } }
		}
	});
	if (!tribe) return json({ error: 'Not found' }, { status: 404 });
	return json({ ...tribe, memberCount: tribe._count.members });
};

// Join request
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = requireUser(locals).id;
	const id = intParam(params.id);
	const body = await request.json().catch(() => ({} as any));
	const { action, message, requestId } = body;

	if (action === 'join') {
		const already = await db.tribeMembership.findFirst({ where: { userId: uid } });
		if (already) return json({ error: 'Already in a tribe' }, { status: 409 });
		const pending = await db.tribeJoinRequest.findFirst({ where: { tribeId: id, userId: uid, status: 'pending' } });
		if (pending) return json({ error: 'Request already sent' }, { status: 409 });
		const req = await db.tribeJoinRequest.create({ data: { tribeId: id, userId: uid, message: message || null } });
		// Notify tribe owner + admins
		const tribe = await db.tribe.findUnique({ where: { id }, select: { name:true, ownerUserId:true } });
		const admins = await db.tribeMembership.findMany({ where: { tribeId: id, role: { in: ['owner','admin'] } } });
		const me = await db.user.findUnique({ where: { id: uid }, select: { nickname:true, discordName:true } });
		for (const a of admins) {
			// tribeId + requestId are what the Accept/Decline buttons on /notifications need.
			// Without them the click handlers can't call back into this endpoint.
			await notify(a.userId, uid, 'tribe_join_request', {
				tribeName: tribe?.name,
				fromName: me?.nickname ?? me?.discordName ?? 'Unknown survivor',
				tribeId: id,
				requestId: req.id
			});
		}
		return json(req, { status: 201 });
	}

	// accept/reject join request (owner/admin)
	if (action === 'accept' || action === 'reject') {
		const membership = await db.tribeMembership.findFirst({ where: { tribeId: id, userId: uid, role: { in: ['owner','admin'] } } });
		if (!membership) return json({ error: 'Unauthorized' }, { status: 403 });
		const req = await db.tribeJoinRequest.findFirst({ where: { id: requestId, tribeId: id } });
		if (!req) return json({ error: 'Not found' }, { status: 404 });
		if (action === 'accept') {
			await db.tribeMembership.create({ data: { tribeId: id, userId: req.userId, role: 'member' } });
			await db.tribeJoinRequest.update({ where: { id: requestId }, data: { status: 'accepted' } });
			const tribe = await db.tribe.findUnique({ where: { id }, select: { name:true } });
			await notify(req.userId, uid, 'tribe_accepted', { tribeName: tribe?.name });
		} else {
			await db.tribeJoinRequest.update({ where: { id: requestId }, data: { status: 'rejected' } });
			const tribe = await db.tribe.findUnique({ where: { id }, select: { name:true } });
			await notify(req.userId, uid, 'tribe_rejected', { tribeName: tribe?.name });
		}
		return json({ ok: true });
	}

	return json({ error: 'Unknown action' }, { status: 400 });
};

// Edit tribe (owner-only): motto, banner, sigil, recruitment, looking-for, map, description, name.
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const uid = requireUser(locals).id;
	const id = intParam(params.id);
	const tribe = await db.tribe.findUnique({ where: { id }, select: { ownerUserId: true } });
	if (!tribe) return json({ error: 'Not found' }, { status: 404 });
	if (tribe.ownerUserId !== uid) return json({ error: 'Owner only' }, { status: 403 });

	const body = await request.json().catch(() => ({}));
	const data: Record<string, unknown> = {};
	const allowed = ['name','mainMap','description','motto','bannerUrl','sigilUrl','recruitmentOpen','lookingFor'] as const;
	for (const k of allowed) {
		if (k in body) data[k] = body[k];
	}
	if (Object.keys(data).length === 0) return json({ error: 'Nothing to update' }, { status: 400 });

	const updated = await db.tribe.update({ where: { id }, data });
	await db.tribalActivity.create({ data: { tribeId: id, userId: uid, eventType: 'tribe_edited', metadata: { fields: Object.keys(data) } } });
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const uid = requireUser(locals).id;
	const id = intParam(params.id);
	const membership = await db.tribeMembership.findFirst({ where: { tribeId: id, userId: uid } });
	if (!membership) return json({ error: 'Not in tribe' }, { status: 404 });
	if (membership.role === 'owner') {
		// Owner can delete the tribe only if no other members remain
		const memberCount = await db.tribeMembership.count({ where: { tribeId: id } });
		if (memberCount > 1) return json({ error: 'Transfer ownership before leaving' }, { status: 400 });
		await db.tribe.delete({ where: { id } });
		return json({ ok: true });
	}
	await db.tribeMembership.delete({ where: { id: membership.id } });
	return json({ ok: true });
};
