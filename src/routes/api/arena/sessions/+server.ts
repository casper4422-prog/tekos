import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { randomBytes } from 'crypto';

export const GET: RequestHandler = async () => {
	const sessions = await db.arenaSession.findMany({
		where: { status: 'open' }, orderBy: { createdAt: 'desc' },
		include: { creator: { select: { nickname:true, email:true } }, _count: { select: { members:true, creatures:true } } }
	});
	return json(sessions.map(s => ({ ...s, memberCount: s._count.members, creatureCount: s._count.creatures })));
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = locals.user!.id;
	const { bossId, bossName, difficulty } = await request.json();
	const joinCode = randomBytes(3).toString('hex').toUpperCase();
	const session = await db.arenaSession.create({ data: { bossId, bossName, creatorUserId: uid, joinCode, difficulty: difficulty ?? 'alpha' } });
	await db.arenaSessionMember.create({ data: { sessionId: session.id, userId: uid } });
	return json(session, { status: 201 });
};
