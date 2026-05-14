import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { encrypt, decrypt } from '$lib/crypto';

function encryptRconPassword(settings: Record<string, unknown>): Record<string, unknown> {
	const cluster = settings.cluster as Record<string, unknown> | null | undefined;
	if (!cluster) return settings;
	const rcon = cluster.rcon as Record<string, unknown> | null | undefined;
	if (!rcon?.password || typeof rcon.password !== 'string' || rcon.password === '') return settings;
	return { ...settings, cluster: { ...cluster, rcon: { ...rcon, password: encrypt(rcon.password) } } };
}

function redactRconPassword(settings: Record<string, unknown>): Record<string, unknown> {
	const cluster = settings.cluster as Record<string, unknown> | null | undefined;
	if (!cluster) return settings;
	const rcon = cluster.rcon as Record<string, unknown> | null | undefined;
	if (!rcon?.password) return settings;
	let decrypted: string | undefined;
	try { decrypted = decrypt(rcon.password as string); } catch { /* not encrypted yet or key changed */ }
	const placeholder = decrypted !== undefined ? '<saved>' : null;
	return { ...settings, cluster: { ...cluster, rcon: { ...rcon, password: placeholder } } };
}

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
	return json(redactRconPassword(merged));
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
		if (key === 'theme') {
			if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
			const t = value as Record<string, unknown>;
			const HEX = /^#[0-9a-fA-F]{6}$/;
			const allowed = ['primary', 'accent', 'bg'];
			if (!allowed.every(k => typeof t[k] === 'string' && HEX.test(t[k] as string))) continue;
		}
		next[key] = value;
	}

	const toSave = encryptRconPassword(next);
	await db.user.update({ where: { id: uid }, data: { settings: toSave } });
	return json({ ok: true, settings: redactRconPassword(next) });
};
