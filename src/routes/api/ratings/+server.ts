import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = locals.user!.id;
	const { ratedUserId, tradeId, rating, comment } = await request.json();
	if (!ratedUserId || !tradeId || !rating) return json({ error: 'Missing fields' }, { status: 400 });
	const existing = await db.tradeRating.findFirst({ where: { raterId: uid, tradeId } });
	if (existing) return json({ error: 'Already rated' }, { status: 409 });
	const r = await db.tradeRating.create({ data: { raterId: uid, ratedUserId, tradeId, rating: Math.min(5, Math.max(1, rating)), comment: comment?.trim() || null } });
	return json(r, { status: 201 });
};

export const GET: RequestHandler = async ({ url }) => {
	const userId = parseInt(url.searchParams.get('userId') ?? '0');
	if (!userId) return json([]);
	const ratings = await db.tradeRating.findMany({
		where: { ratedUserId: userId },
		orderBy: { createdAt: 'desc' },
		include: { rater: { select: { nickname:true, email:true } } }
	});
	const avg = ratings.length ? ratings.reduce((s,r) => s + r.rating, 0) / ratings.length : null;
	return json({ ratings, average: avg ? Math.round(avg * 10) / 10 : null, count: ratings.length });
};
