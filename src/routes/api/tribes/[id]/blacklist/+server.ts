import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';

// Blacklist stored in tribe.colors field as JSON with structure { colors:[], blacklist:[] }
// We extend the existing JSON blob

async function getTribeData(id: number) {
	const t = await db.tribe.findUnique({ where: { id }, select: { colors: true } });
	const raw = t?.colors as Record<string,unknown> | null ?? {};
	return { colors: raw.colors as string[] ?? [], blacklist: raw.blacklist as Record<string,unknown>[] ?? [] };
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const id = intParam(params.id);
	const membership = await db.tribeMembership.findFirst({ where: { tribeId: id, userId: requireUser(locals).id } });
	if (!membership) return json({ error: 'Not in tribe' }, { status: 403 });
	const data = await getTribeData(id);
	return json(data.blacklist);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = requireUser(locals).id;
	const id = intParam(params.id);
	const membership = await db.tribeMembership.findFirst({ where: { tribeId: id, userId: uid, role: { in: ['owner','admin'] } } });
	if (!membership) return json({ error: 'Unauthorized' }, { status: 403 });
	const { name, reason, type } = await request.json();
	if (!name?.trim()) return json({ error: 'Name required' }, { status: 400 });
	const data = await getTribeData(id);
	const entry = { id: Date.now(), name: name.trim(), reason: reason?.trim() || null, type: type || 'player', addedAt: new Date().toISOString(), addedById: uid };
	data.blacklist.push(entry);
	await db.tribe.update({ where: { id }, data: { colors: { colors: data.colors, blacklist: data.blacklist } } });
	return json(entry, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	const uid = requireUser(locals).id;
	const id = intParam(params.id);
	const membership = await db.tribeMembership.findFirst({ where: { tribeId: id, userId: uid, role: { in: ['owner','admin'] } } });
	if (!membership) return json({ error: 'Unauthorized' }, { status: 403 });
	const { entryId } = await request.json();
	const data = await getTribeData(id);
	data.blacklist = data.blacklist.filter((b: Record<string,unknown>) => b.id !== entryId);
	await db.tribe.update({ where: { id }, data: { colors: { colors: data.colors, blacklist: data.blacklist } } });
	return json({ ok: true });
};
