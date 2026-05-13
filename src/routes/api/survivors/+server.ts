import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
	const q        = url.searchParams.get('q')?.trim() ?? '';
	const online   = url.searchParams.get('online') === 'true';
	const inTribe  = url.searchParams.get('inTribe') === 'true';
	const sort     = url.searchParams.get('sort') ?? 'active';
	const page     = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const take     = 40;
	const skip     = (page - 1) * take;

	const ONLINE_MS = 5 * 60 * 1000;
	const onlineSince = new Date(Date.now() - ONLINE_MS);

	const where: Record<string, unknown> = {};
	if (q) {
		where.OR = [
			{ nickname: { contains: q, mode: 'insensitive' } },
			{ email:    { contains: q, mode: 'insensitive' } }
		];
	}
	if (online) where.lastSeen = { gte: onlineSince };
	if (inTribe) where.tribeMemberships = { some: {} };

	const orderBy =
		sort === 'specimens' ? { creatures: { _count: 'desc' as const } } :
		sort === 'joined'    ? { createdAt: 'desc' as const } :
		online               ? { lastSeen: 'desc' as const } :
		                       { lastSeen: 'desc' as const };

	const [users, total, tribeCount, bloodlineCount] = await Promise.all([
		db.user.findMany({
			where,
			orderBy,
			skip,
			take,
			select: {
				id: true,
				nickname: true,
				email: true,
				bio: true,
				lastSeen: true,
				_count: { select: { creatures: true } },
				tribeMemberships: {
					select: { tribe: { select: { name: true } } },
					take: 1
				}
			}
		}),
		db.user.count({ where }),
		db.tribe.count(),
		db.creature.count()
	]);

	const now = Date.now();
	return json({
		users: users.map(u => ({
			id: u.id,
			nickname: u.nickname,
			email: u.email,
			bio: u.bio,
			online: u.lastSeen ? (now - new Date(u.lastSeen).getTime()) < ONLINE_MS : false,
			lastSeen: u.lastSeen,
			specimens: u._count.creatures,
			tribe: u.tribeMemberships[0]?.tribe ?? null
		})),
		total,
		page,
		pages: Math.ceil(total / take),
		tribeCount,
		bloodlineCount
	});
};
