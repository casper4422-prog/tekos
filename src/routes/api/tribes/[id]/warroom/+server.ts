import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';

// List scheduled war rooms for this tribe. Members only.
export const GET: RequestHandler = async ({ params, locals }) => {
	const uid = requireUser(locals).id;
	const tribeId = intParam(params.id);

	const member = await db.tribeMembership.findFirst({ where: { tribeId, userId: uid } });
	if (!member) return json({ error: 'Not in tribe' }, { status: 403 });

	const rooms = await db.warRoom.findMany({
		where: { tribeId, status: { in: ['scheduled', 'in_progress'] } },
		orderBy: { scheduledAt: 'asc' },
		include: { createdBy: { select: { id: true, nickname: true } } }
	});
	return json(rooms);
};

// Schedule a new war room. Owner/admin only.
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = requireUser(locals).id;
	const tribeId = intParam(params.id);

	const me = await db.tribeMembership.findFirst({ where: { tribeId, userId: uid } });
	if (!me || !['owner','admin'].includes(me.role)) return json({ error: 'Owner/admin only' }, { status: 403 });

	const body = await request.json().catch(() => ({}));
	const bossName = String(body.bossName ?? '').trim();
	const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;
	if (!bossName || !scheduledAt || isNaN(scheduledAt.getTime())) return json({ error: 'bossName and scheduledAt required' }, { status: 400 });

	const room = await db.warRoom.create({
		data: {
			tribeId,
			bossName,
			difficulty: body.difficulty ? String(body.difficulty) : null,
			scheduledAt,
			notes: body.notes ? String(body.notes) : null,
			createdByUserId: uid
		}
	});
	await db.tribalActivity.create({ data: { tribeId, userId: uid, eventType: 'warroom_scheduled', metadata: { bossName, scheduledAt: scheduledAt.toISOString(), difficulty: body.difficulty ?? null } } });
	return json(room, { status: 201 });
};
