import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	const uid = locals.user!.id;
	const q = url.searchParams.get('q')?.trim();
	if (!q || q.length < 2) return json([]);

	const users = await db.user.findMany({
		where: {
			id: { not: uid },
			OR: [
				{ nickname: { contains: q, mode: 'insensitive' } },
				{ email:    { contains: q, mode: 'insensitive' } },
				{ discordName: { contains: q, mode: 'insensitive' } },
			]
		},
		select: { id:true, email:true, nickname:true, discordName:true },
		take: 20
	});

	const friendships = await db.friendship.findMany({
		where: { OR: [{ userId: uid }, { friendUserId: uid }] }
	});

	return json(users.map(u => {
		const fs = friendships.find(f => f.userId === u.id || f.friendUserId === u.id);
		return { ...u, friendStatus: fs?.status ?? null, friendId: fs?.id ?? null };
	}));
};
