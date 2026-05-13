import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

const ALLOWED_KEYS = new Set([
	'mapPalette',
	'voiceId',
	'theme',
	'privacy',
	'notifications',
	'cluster',
	'servers',
	'integrations'
]);

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const user = await db.user.findUnique({
		where: { id: locals.user.id },
		select: { settings: true, pinnedCreatures: true }
	});
	const settings = (user?.settings as Record<string, unknown> | null) ?? {};
	// Backfill legacy theme stored on pinnedCreatures JSON
	const legacy = (user?.pinnedCreatures as Record<string, unknown> | null) ?? {};
	const merged: Record<string, unknown> = { ...settings };
	if (merged.theme == null && !Array.isArray(legacy) && (legacy as any).theme) {
		merged.theme = (legacy as any).theme;
	}
	if (merged.mapPalette == null && !Array.isArray(legacy) && (legacy as any).mapPalette) {
		merged.mapPalette = (legacy as any).mapPalette;
	}
	if (merged.voiceId == null && !Array.isArray(legacy) && (legacy as any).voiceId) {
		merged.voiceId = (legacy as any).voiceId;
	}
	return json(merged);
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const uid = locals.user.id;
	const body = (await request.json()) as Record<string, unknown>;

	const user = await db.user.findUnique({
		where: { id: uid },
		select: { settings: true }
	});
	const existing = ((user?.settings as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
	const next: Record<string, unknown> = { ...existing };

	for (const [key, value] of Object.entries(body)) {
		if (!ALLOWED_KEYS.has(key)) continue;
		next[key] = value;
	}

	await db.user.update({ where: { id: uid }, data: { settings: next } });
	return json({ ok: true, settings: next });
};
