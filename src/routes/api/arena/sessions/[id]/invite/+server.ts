import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = requireUser(locals).id;
	const sessionId = intParam(params.id);
	const { friendUserId } = await request.json();
	const session = await db.arenaSession.findUnique({ where: { id: sessionId }, select: { bossName:true, joinCode:true, difficulty:true } });
	if (!session) return json({ error: 'Session not found' }, { status: 404 });
	const me = await db.user.findUnique({ where: { id: uid }, select: { nickname:true, discordName:true } });
	await notify(friendUserId, uid, 'war_room_invite', {
		fromName: me?.nickname ?? me?.discordName ?? 'Unknown survivor',
		bossName: session.bossName,
		difficulty: session.difficulty,
		joinCode: session.joinCode
	});
	return json({ ok: true });
};
