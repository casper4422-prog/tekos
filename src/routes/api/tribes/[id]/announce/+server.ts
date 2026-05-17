import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';
import { postToUserDiscord } from '$lib/discordWebhook';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = requireUser(locals).id;
	const id = intParam(params.id);
	const membership = await db.tribeMembership.findFirst({ where: { tribeId:id, userId:uid, role:{ in:['owner','admin'] } } });
	if (!membership) return json({ error: 'Unauthorized' }, { status: 403 });
	const { message } = await request.json();
	if (!message?.trim()) return json({ error: 'Message required' }, { status: 400 });

	const ann = await db.announcement.create({ data: { type:'tribe', payload:{ tribeId:id, message:message.trim() }, createdById:uid } });

	// Notify all tribe members in-app + optionally forward to their Discord webhook.
	const members = await db.tribeMembership.findMany({ where: { tribeId:id } });
	const me = await db.user.findUnique({ where: { id:uid }, select:{ nickname:true, discordName:true } });
	const tribe = await db.tribe.findUnique({ where: { id }, select:{ name:true } });
	const fromName = me?.nickname ?? me?.discordName ?? 'Unknown survivor';
	const tribeName = tribe?.name ?? 'your tribe';

	for (const m of members) {
		await notify(m.userId, uid, 'tribe_announcement', { tribeName, from: fromName, preview: message.slice(0,80) });
		// Best-effort outbound Discord post — silent if member has no webhook or opted out.
		postToUserDiscord(m.userId, 'tribeAnnounce',
			`📣 **${tribeName} announcement** from **${fromName}**:\n${message.trim()}`,
			{ username: 'TekOS Tribe' }
		).catch(() => {});
	}

	return json(ann, { status: 201 });
};
