import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';
import { requireUser } from '$lib/auth';
import { rateLimit } from '$lib/rateLimit';
import { canSendFriendRequest } from '$lib/privacy';

export const GET: RequestHandler = async ({ url, locals }) => {
	const uid = requireUser(locals).id;
	const status = url.searchParams.get('status') ?? 'accepted';

	if (status === 'accepted') {
		const rows = await db.friendship.findMany({
			where: { OR: [{ userId: uid, status: 'accepted' }, { friendUserId: uid, status: 'accepted' }] },
			include: {
				user:   { select: { id:true, nickname:true, discordName:true, lastSeen:true } },
				friend: { select: { id:true, nickname:true, discordName:true, lastSeen:true } },
			}
		});
		const now = Date.now();
		const ONLINE_MS = 5 * 60 * 1000;
		return json(rows.map(r => {
			const other = r.userId === uid ? r.friend : r.user;
			const isOnline = other.lastSeen && (now - new Date(other.lastSeen).getTime()) < ONLINE_MS;
			return { id: r.id, friendId: other.id, nickname: other.nickname, discordName: other.discordName, online: !!isOnline };
		}));
	}
	if (status === 'pending') {
		const rows = await db.friendship.findMany({
			where: { friendUserId: uid, status: 'pending' },
			include: { user: { select: { id:true, nickname:true, discordName:true } } }
		});
		return json(rows.map(r => ({ id: r.id, fromId: r.userId, nickname: r.user.nickname, discordName: r.user.discordName })));
	}
	if (status === 'sent') {
		const rows = await db.friendship.findMany({
			where: { userId: uid, status: 'pending' },
			include: { friend: { select: { id:true, nickname:true } } }
		});
		return json(rows.map(r => ({ id: r.id, toId: r.friendUserId, nickname: r.friend.nickname })));
	}
	return json([]);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	if (rateLimit(`friend:${uid}`, 30, 60 * 60 * 1000)) return json({ error: 'Too many friend requests, try again later' }, { status: 429 });
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	// Accept either `friendUserId` (older callers) or `toUserId` (Network panel) for the same field.
	const friendUserId = Number(body.friendUserId ?? body.toUserId ?? 0);
	if (!friendUserId || friendUserId === uid) return json({ error: 'Invalid user' }, { status: 400 });
	if (!(await canSendFriendRequest(uid, friendUserId))) {
		return json({ error: 'This survivor isn\'t accepting friend requests from you right now.' }, { status: 403 });
	}
	const existing = await db.friendship.findFirst({ where: { OR: [{ userId: uid, friendUserId }, { userId: friendUserId, friendUserId: uid }] } });
	if (existing) return json({ error: 'Request already exists' }, { status: 409 });
	const row = await db.friendship.create({ data: { userId: uid, friendUserId, status: 'pending' } });
	const me = await db.user.findUnique({ where: { id: uid }, select: { nickname:true, discordName:true } });
	await notify(friendUserId, uid, 'friend_request', { fromName: me?.nickname ?? me?.discordName ?? 'Unknown survivor' });
	return json({ ok: true, id: row.id }, { status: 201 });
};
