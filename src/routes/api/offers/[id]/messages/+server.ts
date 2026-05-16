import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import { notify } from '$lib/notify';
import { intParam } from '$lib/params';

type ThreadEntry = {
	from: number;
	kind: 'chat' | 'counter';
	text: string;
	at: string;
	counterCreatureId?: number | null;
	counterCreatureData?: Record<string, unknown> | null;
};

function readThread(raw: unknown): ThreadEntry[] {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw as ThreadEntry[];
	return [];
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const uid = requireUser(locals).id;
	const id = intParam(params.id);
	const offer = await db.offer.findFirst({
		where: { id, OR: [{ fromUserId: uid }, { toUserId: uid }] },
		select: {
			id: true, tradeId: true, fromUserId: true, toUserId: true,
			offeredCreatureData: true, message: true, thread: true, status: true, createdAt: true,
			fromUser: { select: { id:true, nickname:true, discordName:true } },
			toUser:   { select: { id:true, nickname:true, discordName:true } },
			trade:    { include: { user: { select: { id:true, nickname:true, discordName:true } } } }
		}
	});
	if (!offer) return json({ error: 'Not found' }, { status: 404 });
	return json({ ...offer, thread: readThread(offer.thread) });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = requireUser(locals).id;
	const id = intParam(params.id);
	const offer = await db.offer.findFirst({
		where: { id, OR: [{ fromUserId: uid }, { toUserId: uid }] }
	});
	if (!offer) return json({ error: 'Not found' }, { status: 404 });
	if (offer.status !== 'pending') return json({ error: 'This offer is already closed' }, { status: 400 });

	const body = await request.json().catch(() => ({} as Record<string, unknown>));
	const kind = body.kind === 'counter' ? 'counter' : 'chat';
	const text = String(body.text ?? '').trim();
	const counterCreatureId   = body.counterCreatureId   != null ? Number(body.counterCreatureId)   : null;
	const counterCreatureData = body.counterCreatureData ?? null;

	if (kind === 'chat' && !text) return json({ error: 'Message is required' }, { status: 400 });
	if (kind === 'counter' && !counterCreatureId && !text) return json({ error: 'Counter offer needs a specimen or message' }, { status: 400 });

	const entry: ThreadEntry = {
		from: uid,
		kind,
		text,
		at: new Date().toISOString(),
		counterCreatureId,
		counterCreatureData: counterCreatureData as Record<string, unknown> | null
	};

	const existing = readThread(offer.thread);
	const updated = [...existing, entry];

	await db.offer.update({ where: { id }, data: { thread: updated } });

	const otherUserId = offer.fromUserId === uid ? offer.toUserId : offer.fromUserId;
	const me = await db.user.findUnique({ where: { id: uid }, select: { nickname:true, discordName:true } });
	const fromName = me?.nickname ?? me?.discordName ?? 'Someone';
	await notify(otherUserId, uid, kind === 'counter' ? 'offer_counter' : 'offer_message', {
		offerId: id,
		tradeId: offer.tradeId,
		fromName,
		preview: text.slice(0, 80)
	});

	return json({ ok: true, entry, thread: updated });
};
