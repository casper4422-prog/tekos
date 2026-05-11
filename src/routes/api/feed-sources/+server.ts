import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

// Feed sources stored in user pinnedCreatures JSON as { ..., feedSources: [{type,url,label}] }
async function getSources(uid: number): Promise<Record<string,unknown>[]> {
	const u = await db.user.findUnique({ where:{ id:uid }, select:{ pinnedCreatures:true } });
	const raw = u?.pinnedCreatures as Record<string,unknown> | null ?? {};
	return (raw.feedSources as Record<string,unknown>[]) ?? [];
}

async function saveSources(uid: number, sources: Record<string,unknown>[]) {
	const u = await db.user.findUnique({ where:{ id:uid }, select:{ pinnedCreatures:true } });
	const raw = (u?.pinnedCreatures as Record<string,unknown>) ?? {};
	const updated = Array.isArray(raw) ? { feedSources: sources } : { ...raw, feedSources: sources };
	await db.user.update({ where:{ id:uid }, data:{ pinnedCreatures: updated } });
}

export const GET: RequestHandler = async ({ locals }) => {
	const sources = await getSources(locals.user!.id);
	return json(sources);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = locals.user!.id;
	const { type, url, label } = await request.json();
	if (!url?.trim() || !type) return json({ error:'Missing fields' }, { status:400 });
	const sources = await getSources(uid);
	if (sources.length >= 20) return json({ error:'Max 20 sources' }, { status:400 });
	const entry = { id: Date.now(), type, url: url.trim(), label: label?.trim() || url.trim() };
	sources.push(entry);
	await saveSources(uid, sources);
	return json(entry, { status:201 });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const uid = locals.user!.id;
	const { id } = await request.json();
	const sources = await getSources(uid);
	const filtered = sources.filter((s:Record<string,unknown>) => s.id !== id);
	await saveSources(uid, filtered);
	return json({ ok: true });
};
