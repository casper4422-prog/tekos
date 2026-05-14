import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	const { joinCode } = await request.json();
	const session = await db.arenaSession.findUnique({ where: { joinCode } });
	if (!session || session.status !== 'open') return json({ error: 'Session not found or closed' }, { status: 404 });
	const already = await db.arenaSessionMember.findFirst({ where: { sessionId: session.id, userId: uid } });
	if (!already) await db.arenaSessionMember.create({ data: { sessionId: session.id, userId: uid } });
	return json({ sessionId: session.id });
};
