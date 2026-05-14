import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = requireUser(locals).id;
	const id = intParam(params.id);
	const membership = await db.tribeMembership.findFirst({ where: { tribeId:id, userId:uid, role:{ in:['owner','admin'] } } });
	if (!membership) return json({ error: 'Unauthorized' }, { status: 403 });
	const { message } = await request.json();
	if (!message?.trim()) return json({ error: 'Message required' }, { status: 400 });

	const ann = await db.announcement.create({ data: { type:'tribe', payload:{ tribeId:id, message:message.trim() }, createdById:uid } });

	// Notify all tribe members
	const members = await db.tribeMembership.findMany({ where: { tribeId:id } });
	const me = await db.user.findUnique({ where: { id:uid }, select:{ nickname:true, discordName:true } });
	const tribe = await db.tribe.findUnique({ where: { id }, select:{ name:true } });
	for (const m of members) {
		await notify(m.userId, uid, 'tribe_announcement', { tribeName:tribe?.name, from:me?.nickname??me?.discordName??'Unknown survivor', preview:message.slice(0,80) });
	}

	return json(ann, { status: 201 });
};
