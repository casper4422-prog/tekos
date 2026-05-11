import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await db.user.findUnique({ where: { id: locals.user!.id }, select: { pinnedCreatures: true } });
	const prefs = (user?.pinnedCreatures as Record<string,unknown> | null)?.theme ?? null;
	return json({ theme: prefs });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const uid = locals.user!.id;
	const { theme } = await request.json();
	const user = await db.user.findUnique({ where: { id: uid }, select: { pinnedCreatures: true } });
	const existing = user?.pinnedCreatures as Record<string,unknown> ?? {};
	// Store theme alongside pinned creatures in the JSON field
	const updated = Array.isArray(existing) ? { pins: existing, theme } : { ...existing, theme };
	await db.user.update({ where: { id: uid }, data: { pinnedCreatures: updated } });
	return json({ ok: true });
};
