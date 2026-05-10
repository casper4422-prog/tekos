import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const uid = locals.user!.id;
	const id = parseInt(params.id);
	const { action } = await request.json();
	const row = await db.friendship.findFirst({ where: { id, friendUserId: uid, status: 'pending' } });
	if (!row) return json({ error: 'Not found' }, { status: 404 });
	if (action === 'accept') {
		await db.friendship.update({ where: { id }, data: { status: 'accepted' } });
		const me = await db.user.findUnique({ where: { id: uid }, select: { nickname:true, email:true } });
		await notify(row.userId, uid, 'friend_accepted', { acceptedBy: me?.nickname ?? me?.email });
	} else {
		await db.friendship.delete({ where: { id } });
	}
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const uid = locals.user!.id;
	const id = parseInt(params.id);
	const row = await db.friendship.findFirst({ where: { id, OR: [{ userId: uid }, { friendUserId: uid }] } });
	if (!row) return json({ error: 'Not found' }, { status: 404 });
	await db.friendship.delete({ where: { id } });
	return json({ ok: true });
};
