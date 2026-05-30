import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';
import { postToTribeChannel, COLOR_WARN } from '$lib/discordTribeWebhook';

export const PUT: RequestHandler = async ({ params, locals }) => {
	const id = intParam(params.id);
	const uid = requireUser(locals).id;
	const session = await db.arenaSession.findFirst({
		where: { id, creatorUserId: uid },
		include: { _count: { select: { members: true, creatures: true } } }
	});
	if (!session) return json({ error: 'Unauthorized' }, { status: 403 });
	await db.arenaSession.update({ where: { id }, data: { status: 'closed' } });

	// Discord — post to the creator's tribe webhook with final composition.
	const membership = await db.tribeMembership.findFirst({ where: { userId: uid }, select: { tribeId: true } });
	if (membership) {
		postToTribeChannel(membership.tribeId, {
			title: '⚔ War Room Closed',
			description: `**${session.bossName}** · ${String(session.difficulty ?? '').toUpperCase()}`,
			color: COLOR_WARN,
			fields: [
				{ name: 'Survivors', value: String(session._count.members),  inline: true },
				{ name: 'Tames',     value: String(session._count.creatures), inline: true }
			],
			footer: { text: 'Outcome can be logged from the war-room receipt.' },
			timestamp: new Date().toISOString()
		}).catch(() => {});
	}

	return json({ ok: true });
};
