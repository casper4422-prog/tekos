import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

export const GET: RequestHandler = async ({ url, locals }) => {
	const mineFlag = url.searchParams.get('mine') === 'true';
	if (mineFlag && !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const where = mineFlag ? { userId: requireUser(locals).id, status: 'open' } : { status: 'open' };
	const trades = await db.trade.findMany({
		where, orderBy: { createdAt: 'desc' },
		include: { user: { select: { id: true, nickname: true, discordName: true } } }
	});
	return json(trades);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const uid = locals.user.id;
	const { creatureId, creatureData, wanted, price, listingType, metadata } = await request.json();
	const validType = ['specimen','egg','resource','service'].includes(listingType) ? listingType : 'specimen';
	const trade = await db.trade.create({ data: {
		userId: uid,
		creatureId: validType === 'specimen' ? (creatureId ?? null) : null,
		creatureData: validType === 'specimen' ? (creatureData ?? null) : null,
		listingType: validType,
		metadata: metadata ?? {},
		wanted: wanted ?? null,
		price: price ?? null
	} });
	const cd = creatureData as Record<string,unknown> | null;
	await db.activityEvent.create({ data: { userId: uid, type: 'trade_list', data: { listingType: validType, species: cd?.species ?? null, name: cd?.name ?? null, item: (metadata as Record<string,unknown>|null)?.item ?? null } } }).catch(() => {});
	return json(trade, { status: 201 });
};
