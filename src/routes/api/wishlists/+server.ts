import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const items = await db.wishlist.findMany({ where: { userId: requireUser(locals).id }, orderBy: { createdAt: 'desc' } });
	return json(items);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	const { species, notes } = await request.json();
	if (!species?.trim()) return json({ error: 'Species required' }, { status: 400 });
	const existing = await db.wishlist.findFirst({ where: { userId: uid, species } });
	if (existing) return json({ error: 'Already on wishlist' }, { status: 409 });
	const item = await db.wishlist.create({ data: { userId: uid, species: species.trim(), notes: notes?.trim() || null } });
	return json(item, { status: 201 });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	const uid = requireUser(locals).id;
	const species = url.searchParams.get('species');
	if (!species) return json({ error: 'Species required' }, { status: 400 });
	await db.wishlist.deleteMany({ where: { userId: uid, species } });
	return json({ ok: true });
};
