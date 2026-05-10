import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
	const q       = url.searchParams.get('q')?.trim() ?? '';
	const online  = url.searchParams.get('online') === 'true';
	const page    = parseInt(url.searchParams.get('page') ?? '1');
	const take    = 40;
	const skip    = (page - 1) * take;

	const ONLINE_MS = 5 * 60 * 1000;
	const onlineSince = new Date(Date.now() - ONLINE_MS);

	const where: Record<string,unknown> = {};
	if (q) where.OR = [{ nickname: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }];
	if (online) where.lastSeen = { gte: onlineSince };

	const [users, total] = await Promise.all([
		db.user.findMany({
			where,
			orderBy: online ? { lastSeen: 'desc' } : { createdAt: 'desc' },
			skip, take,
			select: { id:true, nickname:true, email:true, bio:true, lastSeen:true, _count:{ select:{ creatures:true } } },
			include: { tribeMemberships: { include: { tribe: { select:{ name:true } } }, take:1 } } as Record<string,unknown>
		}),
		db.user.count({ where })
	]);

	const now = Date.now();
	return json({
		users: users.map((u: Record<string,unknown>) => {
			const user = u as Record<string,unknown> & { lastSeen: Date|null; _count: Record<string,number>; tribeMemberships: Record<string,unknown>[] };
			return {
				id: user.id, nickname: user.nickname, email: user.email, bio: user.bio,
				online: user.lastSeen ? (now - new Date(user.lastSeen).getTime()) < ONLINE_MS : false,
				specimens: user._count.creatures,
				tribe: user.tribeMemberships?.[0] ? (user.tribeMemberships[0] as Record<string,unknown>).tribe : null
			};
		}),
		total, page, pages: Math.ceil(total / take)
	});
};
