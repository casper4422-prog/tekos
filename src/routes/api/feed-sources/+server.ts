import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

// Feed sources now live in their own Prisma table (FeedSource), not on
// User.pinnedCreatures JSON. Previous JSON storage got clobbered by the
// BreedingProject migration that cleared pinnedCreatures = [] on first
// dossier load — users had to re-subscribe to the recommended sources
// every visit. A real table keeps these safe.

const MAX_SOURCES = 20;

export const GET: RequestHandler = async ({ locals }) => {
    const uid = requireUser(locals).id;
    const rows = await db.feedSource.findMany({
        where: { userId: uid },
        orderBy: { createdAt: 'asc' }
    });
    return json(rows.map(r => ({ id: r.id, type: r.type, url: r.url, label: r.label })));
};

export const POST: RequestHandler = async ({ request, locals }) => {
    const uid = requireUser(locals).id;
    const { type, url, label } = await request.json();
    if (!url?.trim() || !type) return json({ error: 'Missing fields' }, { status: 400 });

    const count = await db.feedSource.count({ where: { userId: uid } });
    if (count >= MAX_SOURCES) return json({ error: `Max ${MAX_SOURCES} sources` }, { status: 400 });

    try {
        const entry = await db.feedSource.create({
            data: {
                userId: uid,
                type: String(type),
                url: String(url).trim(),
                label: (label && String(label).trim()) || String(url).trim()
            }
        });
        return json({ id: entry.id, type: entry.type, url: entry.url, label: entry.label }, { status: 201 });
    } catch (e) {
        // P2002 = unique constraint violation on (userId, url) — already subscribed
        if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002') {
            return json({ error: 'Already subscribed to this source' }, { status: 409 });
        }
        throw e;
    }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
    const uid = requireUser(locals).id;
    const { id } = await request.json();
    if (!Number.isFinite(Number(id))) return json({ error: 'Missing id' }, { status: 400 });
    await db.feedSource.deleteMany({ where: { id: Number(id), userId: uid } });
    return json({ ok: true });
};
