import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	const tribe = await db.tribe.findUnique({
		where: { id },
		include: {
			members: { include: { user: { select: { id:true, nickname:true, email:true, lastSeen:true } } }, orderBy: { role: 'asc' } },
			_count: { select: { members: true } }
		}
	});
	if (!tribe) return json({ error: 'Not found' }, { status: 404 });
	return json({ ...tribe, memberCount: tribe._count.members });
};

// Join request
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = locals.user!.id;
	const id = parseInt(params.id);
	const { action, message } = await request.json().catch(() => ({}));

	if (action === 'join') {
		const already = await db.tribeMembership.findFirst({ where: { userId: uid } });
		if (already) return json({ error: 'Already in a tribe' }, { status: 409 });
		const pending = await db.tribeJoinRequest.findFirst({ where: { tribeId: id, userId: uid, status: 'pending' } });
		if (pending) return json({ error: 'Request already sent' }, { status: 409 });
		const req = await db.tribeJoinRequest.create({ data: { tribeId: id, userId: uid, message: message || null } });
		// Notify tribe owner + admins
		const tribe = await db.tribe.findUnique({ where: { id }, select: { name:true, ownerUserId:true } });
		const admins = await db.tribeMembership.findMany({ where: { tribeId: id, role: { in: ['owner','admin'] } } });
		const me = await db.user.findUnique({ where: { id: uid }, select: { nickname:true, email:true } });
		for (const a of admins) {
			await notify(a.userId, uid, 'tribe_join_request', { tribeName: tribe?.name, fromName: me?.nickname ?? me?.email });
		}
		return json(req, { status: 201 });
	}

	// accept/reject join request (owner/admin)
	if (action === 'accept' || action === 'reject') {
		const { requestId } = await request.json().catch(() => ({}));
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

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const uid = locals.user!.id;
	const id = parseInt(params.id);
	const membership = await db.tribeMembership.findFirst({ where: { tribeId: id, userId: uid } });
	if (!membership) return json({ error: 'Not in tribe' }, { status: 404 });
	if (membership.role === 'owner') return json({ error: 'Transfer ownership before leaving' }, { status: 400 });
	await db.tribeMembership.delete({ where: { id: membership.id } });
	return json({ ok: true });
};
