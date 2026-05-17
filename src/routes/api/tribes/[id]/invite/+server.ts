import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';
import { canInviteToTribe } from '$lib/privacy';

// Invite a survivor to this tribe. Owner/admin only. Sends a tribe_invite notification.
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = requireUser(locals).id;
	const id = intParam(params.id);

	const me = await db.tribeMembership.findFirst({ where: { tribeId: id, userId: uid }, include: { tribe: { select: { name: true } } } });
	if (!me || !['owner','admin'].includes(me.role)) return json({ error: 'Owner/admin only' }, { status: 403 });

	const body = await request.json().catch(() => ({}));
	const rawUserId = Number(body.userId);
	const handle = String(body.handle ?? '').trim();
	if (!Number.isFinite(rawUserId) && !handle) {
		return json({ error: 'userId or handle is required' }, { status: 400 });
	}

	const target = Number.isFinite(rawUserId)
		? await db.user.findUnique({
			where: { id: rawUserId },
			select: { id: true, nickname: true, discordName: true }
		})
		: await db.user.findFirst({
			where: { OR: [{ nickname: handle }, { email: handle }] },
			select: { id: true, nickname: true, discordName: true }
		});
	if (!target) return json({ error: 'Survivor not found' }, { status: 404 });

	const already = await db.tribeMembership.findFirst({ where: { userId: target.id } });
	if (already) return json({ error: 'Already in a tribe' }, { status: 409 });

	if (!(await canInviteToTribe(uid, target.id))) {
		return json({ error: 'This survivor isn\'t accepting tribe invites right now.' }, { status: 403 });
	}

	await notify(target.id, uid, 'tribe_invite', { tribeId: id, tribeName: me.tribe.name });
	await db.tribalActivity.create({ data: { tribeId: id, userId: uid, eventType: 'invite_sent', metadata: { targetId: target.id, targetName: target.nickname ?? target.discordName ?? 'Unknown survivor' } } });
	return json({ ok: true });
};
