/**
 * /api/pinned-projects
 *
 * Pin-as-project storage for the dossier's "Active Breeding Projects" lane.
 * Backed by the existing `user.pinnedCreatures` JSON column.
 *
 * Storage shape (new):
 *   PinnedProject[] = [{ creatureId: number, focusStat: string|null,
 *                        targetMutations: number, pinnedAt: string (ISO) }, ...]
 *
 * Backwards compatibility: legacy entries that are bare numbers (e.g. [12, 7, 3])
 * are coerced on read into the new project shape with focusStat=null, muts=0.
 *
 * Endpoints:
 *   GET    → returns { projects: PinnedProject[] }
 *   POST   → body { creatureId, focusStat?, targetMutations? }
 *            inserts or updates the entry for that creatureId, enforces max 3
 *            (configurable per-call via ?max=N, capped at 6). Returns full list.
 *   DELETE → ?id=N removes by creatureId. Returns full list.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

const FOCUS_STATS = new Set(['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA', 'SPD']);
const HARD_MAX = 6;
const DEFAULT_MAX = 3;

export type PinnedProject = {
    creatureId: number;
    focusStat: string | null;
    targetMutations: number;
    pinnedAt: string;
};

function coerce(raw: unknown): PinnedProject[] {
    if (!Array.isArray(raw)) return [];
    const out: PinnedProject[] = [];
    const now = new Date().toISOString();
    for (const item of raw) {
        if (typeof item === 'number') {
            // Legacy: bare creature id
            out.push({ creatureId: item, focusStat: null, targetMutations: 0, pinnedAt: now });
        } else if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            const id = Number(obj.creatureId);
            if (!Number.isFinite(id)) continue;
            const stat = typeof obj.focusStat === 'string' && FOCUS_STATS.has(obj.focusStat)
                ? obj.focusStat
                : null;
            const muts = Math.max(0, Math.min(99, Number(obj.targetMutations) || 0));
            const at = typeof obj.pinnedAt === 'string' ? obj.pinnedAt : now;
            out.push({ creatureId: id, focusStat: stat, targetMutations: muts, pinnedAt: at });
        }
    }
    return out;
}

async function readProjects(userId: number): Promise<PinnedProject[]> {
    const u = await db.user.findUnique({
        where: { id: userId },
        select: { pinnedCreatures: true }
    });
    return coerce(u?.pinnedCreatures);
}

async function writeProjects(userId: number, projects: PinnedProject[]) {
    await db.user.update({
        where: { id: userId },
        data: { pinnedCreatures: projects as unknown as object }
    });
}

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
    const projects = await readProjects(locals.user.id);
    return json({ projects });
};

export const POST: RequestHandler = async ({ request, locals, url }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        throw error(400, 'Invalid JSON body');
    }
    const creatureId = Number((body as { creatureId?: unknown }).creatureId);
    if (!Number.isFinite(creatureId)) {
        throw error(400, 'creatureId is required');
    }

    // Verify ownership of the creature
    const owned = await db.creature.findFirst({
        where: { id: creatureId, userId: locals.user.id },
        select: { id: true }
    });
    if (!owned) throw error(404, 'Creature not found in your specimens');

    const rawStat = (body as { focusStat?: unknown }).focusStat;
    const focusStat = typeof rawStat === 'string' && FOCUS_STATS.has(rawStat) ? rawStat : null;
    const targetMutations = Math.max(
        0,
        Math.min(99, Number((body as { targetMutations?: unknown }).targetMutations) || 0)
    );

    const maxParam = Number(url.searchParams.get('max'));
    const maxProjects = Number.isFinite(maxParam) && maxParam > 0
        ? Math.min(maxParam, HARD_MAX)
        : DEFAULT_MAX;

    const projects = await readProjects(locals.user.id);
    const existingIdx = projects.findIndex((p) => p.creatureId === creatureId);
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
        // Update in place, preserve pinnedAt
        projects[existingIdx] = {
            ...projects[existingIdx],
            focusStat,
            targetMutations
        };
    } else {
        if (projects.length >= maxProjects) {
            throw error(409, `Max ${maxProjects} pinned projects reached`);
        }
        projects.push({ creatureId, focusStat, targetMutations, pinnedAt: now });
    }

    await writeProjects(locals.user.id, projects);
    return json({ projects });
};

export const DELETE: RequestHandler = async ({ locals, url }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const id = Number(url.searchParams.get('id'));
    if (!Number.isFinite(id)) throw error(400, '?id=<creatureId> required');

    const projects = await readProjects(locals.user.id);
    const next = projects.filter((p) => p.creatureId !== id);
    await writeProjects(locals.user.id, next);
    return json({ projects: next });
};
