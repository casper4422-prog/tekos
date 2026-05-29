/**
 * /api/pinned-projects
 *
 * Pinned breeding projects shown on the Dossier's "Active Breeding Projects"
 * lane. Backed by the BreedingProject Prisma table, keyed by
 * (userId, creatureId, focusStat) — so a survivor can pin the same creature
 * for multiple stats and each one renders as its own card.
 *
 * Storage shape (returned to the client):
 *   { id, creatureId, focusStat, targetMutations, pinnedAt }[]
 *
 * Endpoints:
 *   GET    → returns { projects: BreedingProject[] }
 *   POST   → body { creatureId, focusStat, targetMutations? }
 *            upserts the entry for that (creatureId, focusStat). Enforces a
 *            hard cap of 6 total projects per user (any stat, any creature).
 *            focusStat is required — without one, there's nothing to track.
 *   DELETE → ?id=N&focusStat=X removes the matching project. Without
 *            focusStat, removes all projects for that creature.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

const FOCUS_STATS = new Set(['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA', 'SPD']);
const HARD_MAX = 6;

export type PinnedProject = {
    id: number;
    creatureId: number;
    focusStat: string;
    targetMutations: number;
    pinnedAt: string;
};

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
    const rows = await db.breedingProject.findMany({
        where: { userId: locals.user.id },
        orderBy: { pinnedAt: 'asc' }
    });
    const projects: PinnedProject[] = rows.map(r => ({
        id: r.id,
        creatureId: r.creatureId,
        focusStat: r.focusStat,
        targetMutations: r.targetMutations,
        pinnedAt: r.pinnedAt.toISOString()
    }));
    return json({ projects });
};

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        throw error(400, 'Invalid JSON body');
    }
    const creatureId = Number((body as { creatureId?: unknown }).creatureId);
    if (!Number.isFinite(creatureId)) {
        throw error(400, 'creatureId is required');
    }

    const rawStat = (body as { focusStat?: unknown }).focusStat;
    if (typeof rawStat !== 'string' || !FOCUS_STATS.has(rawStat)) {
        throw error(400, 'focusStat is required (HP, STA, OXY, FOOD, WGT, MEL, CRA, or SPD)');
    }
    const focusStat = rawStat;
    const targetMutations = Math.max(
        0,
        Math.min(99, Number((body as { targetMutations?: unknown }).targetMutations) || 0)
    );

    // Verify ownership of the creature
    const owned = await db.creature.findFirst({
        where: { id: creatureId, userId: locals.user.id },
        select: { id: true }
    });
    if (!owned) throw error(404, 'Creature not found in your specimens');

    // Check the cap BEFORE upsert — but only if this is a NEW (creature, stat)
    // pairing. Updates to an existing pin don't count against the cap.
    const existing = await db.breedingProject.findUnique({
        where: {
            userId_creatureId_focusStat: {
                userId: locals.user.id,
                creatureId,
                focusStat
            }
        },
        select: { id: true }
    });
    if (!existing) {
        const total = await db.breedingProject.count({ where: { userId: locals.user.id } });
        if (total >= HARD_MAX) {
            throw error(409, `Max ${HARD_MAX} pinned projects reached`);
        }
    }

    await db.breedingProject.upsert({
        where: {
            userId_creatureId_focusStat: {
                userId: locals.user.id,
                creatureId,
                focusStat
            }
        },
        update: { targetMutations },
        create: {
            userId: locals.user.id,
            creatureId,
            focusStat,
            targetMutations
        }
    });

    const rows = await db.breedingProject.findMany({
        where: { userId: locals.user.id },
        orderBy: { pinnedAt: 'asc' }
    });
    const projects: PinnedProject[] = rows.map(r => ({
        id: r.id,
        creatureId: r.creatureId,
        focusStat: r.focusStat,
        targetMutations: r.targetMutations,
        pinnedAt: r.pinnedAt.toISOString()
    }));
    return json({ projects });
};

export const DELETE: RequestHandler = async ({ locals, url }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const id = Number(url.searchParams.get('id'));
    if (!Number.isFinite(id)) throw error(400, '?id=<creatureId> required');

    const focusStatParam = url.searchParams.get('focusStat');

    if (focusStatParam) {
        // Compound delete — single project
        if (!FOCUS_STATS.has(focusStatParam)) {
            throw error(400, 'Invalid focusStat');
        }
        await db.breedingProject.deleteMany({
            where: {
                userId: locals.user.id,
                creatureId: id,
                focusStat: focusStatParam
            }
        });
    } else {
        // No focusStat — remove all projects for this creature
        await db.breedingProject.deleteMany({
            where: { userId: locals.user.id, creatureId: id }
        });
    }

    const rows = await db.breedingProject.findMany({
        where: { userId: locals.user.id },
        orderBy: { pinnedAt: 'asc' }
    });
    const projects: PinnedProject[] = rows.map(r => ({
        id: r.id,
        creatureId: r.creatureId,
        focusStat: r.focusStat,
        targetMutations: r.targetMutations,
        pinnedAt: r.pinnedAt.toISOString()
    }));
    return json({ projects });
};
