import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Prisma } from '@prisma/client';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

// POST /api/creatures/import
// Body: an array of creature data objects (the same shape /api/creatures GET returns),
// or { creatures: [...] }. Each entry's `id` and `createdAt` are stripped — the DB
// assigns new ones so re-imports never collide with existing rows.
export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	const raw = await request.json().catch(() => null);
	if (raw == null) return json({ error: 'Body must be JSON' }, { status: 400 });

	const rows: unknown[] = Array.isArray(raw)
		? raw
		: (Array.isArray((raw as Record<string, unknown>).creatures) ? ((raw as Record<string, unknown>).creatures as unknown[]) : []);

	if (!Array.isArray(rows) || rows.length === 0) {
		return json({ error: 'No creatures found in payload — expected a JSON array or { creatures: [...] }' }, { status: 400 });
	}
	if (rows.length > 5000) {
		return json({ error: 'Import limited to 5000 creatures at a time' }, { status: 400 });
	}

	let inserted = 0;
	let skipped = 0;
	const errors: string[] = [];

	// Insert sequentially so a single bad row doesn't abort the whole batch.
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (!row || typeof row !== 'object') { skipped++; continue; }
		const data = { ...(row as Record<string, unknown>) };
		// Strip server-controlled fields so the DB assigns fresh ones.
		delete (data as Record<string, unknown>).id;
		delete (data as Record<string, unknown>).createdAt;
		delete (data as Record<string, unknown>).updatedAt;
		delete (data as Record<string, unknown>).userId;
		if (!data.species && !data.name) { skipped++; continue; }
		try {
			await db.creature.create({ data: { userId: uid, data: data as Prisma.InputJsonValue } });
			inserted++;
		} catch (e) {
			errors.push(`Row ${i}: ${(e as Error).message ?? 'insert failed'}`);
			skipped++;
		}
	}

	return json({ ok: true, inserted, skipped, errors: errors.slice(0, 10) });
};
