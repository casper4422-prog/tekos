import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Prisma } from '@prisma/client';
import { db } from '$lib/db';
import { intParam } from '$lib/params';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = intParam(params.id);
	const existing = await db.creature.findFirst({ where: { id, userId: locals.user.id } });
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	const data = await request.json();
	await db.creature.update({ where: { id }, data: { data } });
	return json({ ...data, id });
};

// PATCH — shallow merge with one level of nested-object deep-merge so the
// dossier's mutation bumper can write {mutations:{HP:12}} without clobbering
// the other stat keys. Used wherever a caller needs to update one field on
// creature.data without holding the full data blob.
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = intParam(params.id);
	const existing = await db.creature.findFirst({ where: { id, userId: locals.user.id } });
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	const patch = await request.json() as Record<string, unknown>;
	const existingData = (existing.data as Record<string, unknown> | null) ?? {};
	const merged: Record<string, unknown> = { ...existingData };
	for (const [key, value] of Object.entries(patch)) {
		const prev = existingData[key];
		const bothPlainObj =
			value && typeof value === 'object' && !Array.isArray(value) &&
			prev && typeof prev === 'object' && !Array.isArray(prev);
		merged[key] = bothPlainObj
			? { ...(prev as Record<string, unknown>), ...(value as Record<string, unknown>) }
			: value;
	}
	await db.creature.update({ where: { id }, data: { data: merged as Prisma.InputJsonValue } });
	return json({ ...merged, id });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = intParam(params.id);
	const existing = await db.creature.findFirst({ where: { id, userId: locals.user.id } });
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	await db.creature.delete({ where: { id } });
	return json({ ok: true });
};
