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
	const { creatureId, creatureData, wanted, price, listingType, metadata, direction } = await request.json();
	const validType = ['specimen','egg','resource','service'].includes(listingType) ? listingType : 'specimen';
	const validDirection = direction === 'buy' ? 'buy' : 'sell';
	// Store direction inside the existing metadata JSON column so we don't need a schema change.
	const incomingMeta = (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) ? metadata as Record<string,unknown> : {};
	const finalMeta = { ...incomingMeta, direction: validDirection };

	// WTB (buy) listings don't carry a real creatureData — the buyer is requesting one.
	const isBuy = validDirection === 'buy';

	const trade = await db.trade.create({ data: {
		userId: uid,
		creatureId:   isBuy ? null : (validType === 'specimen' ? (creatureId ?? null) : null),
		creatureData: isBuy ? null : (validType === 'specimen' ? (creatureData ?? null) : null),
		listingType: validType,
		metadata: finalMeta,
		wanted: wanted ?? null,
		price: price ?? null
	} });
	const cd = creatureData as Record<string,unknown> | null;
	await db.activityEvent.create({ data: { userId: uid, type: 'trade_list', data: { listingType: validType, direction: validDirection, species: cd?.species ?? finalMeta.wantedSpecies ?? null, name: cd?.name ?? null, item: finalMeta.item ?? null } } }).catch(() => {});
	return json(trade, { status: 201 });
};
