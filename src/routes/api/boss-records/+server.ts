import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const records = await db.bossRecord.findMany({ where: { userId: requireUser(locals).id }, orderBy: { createdAt: 'desc' }, take: 50 });
	return json(records);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	const { bossName, mapName, difficulty, outcome, notes, creaturesUsed, squadMembers, duration } = await request.json();
	const record = await db.bossRecord.create({ data: { userId:uid, bossName, mapName:mapName??null, difficulty:difficulty??null, outcome:outcome??'success', notes:notes??null, creaturesUsed:creaturesUsed??[], squadMembers:squadMembers??[], duration:duration??null } });
	// Log to activity feed
	await db.activityEvent.create({ data: { userId:uid, type:'boss_fight', data:{ bossName, difficulty, outcome:outcome??'success' } } }).catch(() => {});
	return json(record, { status: 201 });
};
