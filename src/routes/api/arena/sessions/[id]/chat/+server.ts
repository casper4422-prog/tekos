import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

function parseSessionId(raw: string) {
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : null;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const sessionId = parseSessionId(params.id);
	if (!sessionId) return json({ error: 'Invalid id' }, { status: 400 });
	const member = await db.arenaSessionMember.findFirst({ where: { sessionId, userId: locals.user.id } });
	if (!member) return json({ error: 'Forbidden' }, { status: 403 });
	const msgs = await db.arenaChat.findMany({
		where: { sessionId },
		orderBy: { createdAt: 'asc' }, take: 200,
		// `email` is included as a last-resort fallback for users who haven't set a nickname
		// or linked Discord — the client renders the local-part before @.
		include: { user: { select: { nickname: true, discordName: true, email: true } } }
	});
	return json(msgs);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const sessionId = parseSessionId(params.id);
	if (!sessionId) return json({ error: 'Invalid id' }, { status: 400 });
	const member = await db.arenaSessionMember.findFirst({ where: { sessionId, userId: locals.user.id } });
	if (!member) return json({ error: 'Forbidden' }, { status: 403 });
	const uid = locals.user.id;
	const { content, messageType } = await request.json();
	const msg = await db.arenaChat.create({ data: { sessionId, userId: uid, content, messageType: messageType ?? 'text' } });
	return json(msg, { status: 201 });
};
