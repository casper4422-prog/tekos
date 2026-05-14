import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const uid = locals.user.id;
	const { ratedUserId, tradeId, rating, comment } = await request.json();
	if (!ratedUserId || !tradeId || !rating) return json({ error: 'Missing fields' }, { status: 400 });

	// Verify the trade exists and is closed/completed
	const trade = await db.trade.findUnique({ where: { id: tradeId } });
	if (!trade) return json({ error: 'Trade not found' }, { status: 404 });
	if (trade.status !== 'closed' && trade.status !== 'completed') return json({ error: 'Trade is not completed' }, { status: 403 });

	// Verify the rater was party to the trade
	const isOwner = trade.userId === uid;
	// Owner: find the accepted offer to identify the buyer (don't filter by fromUserId — owner never makes offers)
	// Buyer: verify you specifically made the accepted offer
	const acceptedOffer = isOwner
		? await db.offer.findFirst({ where: { tradeId, status: 'accepted' }, select: { fromUserId: true } })
		: await db.offer.findFirst({ where: { tradeId, fromUserId: uid, status: 'accepted' }, select: { fromUserId: true } });
	if (!isOwner && !acceptedOffer) return json({ error: 'You were not party to this trade' }, { status: 403 });

	// Verify ratedUserId is the OTHER party, not the rater
	const otherPartyId = isOwner ? acceptedOffer?.fromUserId : trade.userId;
	if (ratedUserId !== otherPartyId) return json({ error: 'Invalid rated user' }, { status: 403 });

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
		include: { rater: { select: { nickname: true, discordName: true } } }
	});
	const avg = ratings.length ? ratings.reduce((s,r) => s + r.rating, 0) / ratings.length : null;
	return json({ ratings, average: avg ? Math.round(avg * 10) / 10 : null, count: ratings.length });
};
