import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { randomBytes } from 'crypto';
import { requireUser } from '$lib/auth';
import { postToTribeChannel, COLOR_SUCCESS } from '$lib/discordTribeWebhook';

export const GET: RequestHandler = async () => {
	const sessions = await db.arenaSession.findMany({
		where: { status: 'open' }, orderBy: { createdAt: 'desc' },
		include: { creator: { select: { nickname:true } }, _count: { select: { members:true, creatures:true } } }
	});
	return json(sessions.map(s => ({ ...s, memberCount: s._count.members, creatureCount: s._count.creatures })));
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	const { bossId, bossName, difficulty } = await request.json();
	const joinCode = randomBytes(4).toString('hex').toUpperCase();
	const session = await db.arenaSession.create({ data: { bossId, bossName, creatorUserId: uid, joinCode, difficulty: difficulty ?? 'alpha' } });
	await db.arenaSessionMember.create({ data: { sessionId: session.id, userId: uid } });

	// Discord — post to the creator's tribe webhook (if they're in a tribe with a webhook set).
	const membership = await db.tribeMembership.findFirst({ where: { userId: uid }, select: { tribeId: true } });
	if (membership) {
		postToTribeChannel(membership.tribeId, {
			title: '⚔ War Room Opened',
			description: `**${bossName}** · ${String(difficulty ?? 'alpha').toUpperCase()}`,
			color: COLOR_SUCCESS,
			fields: [
				{ name: 'Join Code', value: `\`${joinCode}\``, inline: true },
				{ name: 'Status',    value: 'Recruiting tribe to commit creatures & roll out.', inline: false }
			],
			timestamp: new Date().toISOString()
		}).catch(() => {});
	}

	return json(session, { status: 201 });
};
