import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';

// GET /api/users/[id] — public profile basics for partner lookup in DM threads etc.
export const GET: RequestHandler = async ({ params, locals }) => {
	requireUser(locals);
	const id = intParam(params.id, 'id');
	const u = await db.user.findUnique({
		where: { id },
		select: { id: true, nickname: true, discordName: true, lastSeen: true }
	});
	if (!u) return json({ error: 'Not found' }, { status: 404 });
	const now = Date.now();
	const online = u.lastSeen ? (now - new Date(u.lastSeen).getTime()) < 5 * 60 * 1000 : false;
	return json({ id: u.id, nickname: u.nickname, discordName: u.discordName, online });
};
