import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';

// Promote / demote: POST { action: 'promote' | 'demote' }. Owner only.
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = locals.user!.id;
	const tribeId = parseInt(params.id);
	const memberId = parseInt(params.memberId);

	const tribe = await db.tribe.findUnique({ where: { id: tribeId }, select: { ownerUserId: true, name: true } });
	if (!tribe) return json({ error: 'Not found' }, { status: 404 });
	if (tribe.ownerUserId !== uid) return json({ error: 'Owner only' }, { status: 403 });

	const member = await db.tribeMembership.findFirst({ where: { id: memberId, tribeId } });
	if (!member) return json({ error: 'Member not found' }, { status: 404 });
	if (member.role === 'owner') return json({ error: "Can't change owner role" }, { status: 400 });

	const { action } = await request.json().catch(() => ({}));
	let newRole: string | null = null;
	if (action === 'promote' && member.role === 'member') newRole = 'admin';
	else if (action === 'demote' && member.role === 'admin') newRole = 'member';
	else return json({ error: `Cannot ${action} from ${member.role}` }, { status: 400 });

	await db.tribeMembership.update({ where: { id: memberId }, data: { role: newRole } });
	await db.tribalActivity.create({ data: { tribeId, userId: uid, eventType: action === 'promote' ? 'member_promoted' : 'member_demoted', metadata: { memberUserId: member.userId, newRole } } });
	await notify(member.userId, uid, `tribe_${action}`, { tribeName: tribe.name, newRole });
	return json({ ok: true, role: newRole });
};

// Kick a member. Owner/admin only. Cannot kick the owner. Admins cannot kick other admins.
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const uid = locals.user!.id;
	const tribeId = parseInt(params.id);
	const memberId = parseInt(params.memberId);

	const me = await db.tribeMembership.findFirst({ where: { tribeId, userId: uid }, include: { tribe: { select: { name: true } } } });
	if (!me || !['owner','admin'].includes(me.role)) return json({ error: 'Owner/admin only' }, { status: 403 });

	const target = await db.tribeMembership.findFirst({ where: { id: memberId, tribeId } });
	if (!target) return json({ error: 'Member not found' }, { status: 404 });
	if (target.role === 'owner') return json({ error: "Can't kick the owner" }, { status: 400 });
	if (me.role === 'admin' && target.role === 'admin') return json({ error: 'Admins cannot kick admins' }, { status: 403 });

	await db.tribeMembership.delete({ where: { id: memberId } });
	await db.tribalActivity.create({ data: { tribeId, userId: uid, eventType: 'member_kicked', metadata: { kickedUserId: target.userId } } });
	await notify(target.userId, uid, 'tribe_kicked', { tribeName: me.tribe.name });
	return json({ ok: true });
};
