import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import type { Stats } from '$lib/badges';

export type SpecimenDetail = {
    id: number;
    createdAt: Date;
    name: string;
    species: string;
    level: number;
    gender: string;
    baseStats: Stats;
    mutations: Stats;
    notes?: string;
    server?: string;
    imprint?: number;
    wildLevel?: number;
    tamedLevel?: number;
    paternalId?: number;
    maternalId?: number;
    partnerId?: number;
    isFounder?: boolean;
    retired?: boolean;
    // New Specimen Notes fields (planning notes §5) — all stored on creature.data
    colorRegions?: string[];                  // 6 slots: ['Red', 'Blue', '', '', 'Yellow', '']
    role?: string;                            // Breeder | Tank | DPS | Harvester | Flyer | Utility
    availableForBreeding?: boolean;
    availableForTrade?: boolean;
    obtainedFrom?: string;                    // free-text label, may co-exist with obtainedFromUserId
    obtainedFromUserId?: number;              // when set, render obtainedFrom as a /survivors/[id] link
    cryoLocation?: string;                    // free text: which fridge/pod
};

export type SpecimenLite = {
    id: number;
    name: string;
    species: string;
    level: number;
    gender: string;
    baseStats: Stats;
    mutations: Stats;
    paternalId?: number;
    maternalId?: number;
    isFounder?: boolean;
    createdAt: Date;
};

export type PinnedProject = {
    creatureId: number;
    focusStat?: string;
    targetMutations?: number;
};

/** Total mutations across all stats (each unit in Stats = +2 levels, so muts = sum / 2 doesn't apply here — we sum raw). */
function totalMutCount(m: Stats): number {
    return Object.values(m).reduce((s, n) => s + (Number(n) || 0), 0);
}

function liteFromRow(r: { id: number; data: unknown; createdAt: Date }): SpecimenLite {
    const d = (r.data ?? {}) as Record<string, unknown>;
    return {
        id: r.id,
        name:     String(d.name ?? 'Unnamed'),
        species:  String(d.species ?? 'Unknown'),
        level:    Number(d.level ?? 1),
        gender:   String(d.gender ?? 'Unknown'),
        baseStats:  (d.baseStats as Stats) ?? {},
        mutations:  (d.mutations as Stats) ?? {},
        paternalId: typeof d.paternalId === 'number' ? d.paternalId : undefined,
        maternalId: typeof d.maternalId === 'number' ? d.maternalId : undefined,
        isFounder:  d.isFounder === true,
        createdAt:  r.createdAt
    };
}

export const load: PageServerLoad = async ({ params, locals }) => {
    const id = parseInt(params.id);
    if (!Number.isFinite(id)) throw error(404, 'Specimen not found');

    const row = await db.creature.findUnique({
        where: { id },
        include: { user: { select: { id: true, nickname: true, discordName: true, pinnedCreatures: true } } }
    });
    if (!row) throw error(404, 'Specimen not found');

    const d = row.data as Record<string, unknown>;
    const creature: SpecimenDetail = {
        id:        row.id,
        createdAt: row.createdAt,
        name:      String(d.name ?? 'Unnamed'),
        species:   String(d.species ?? 'Unknown'),
        level:     Number(d.level ?? 1),
        gender:    String(d.gender ?? 'Unknown'),
        baseStats: (d.baseStats as Stats) ?? {},
        mutations: (d.mutations as Stats) ?? {},
        notes:     typeof d.notes === 'string' ? d.notes : undefined,
        server:    typeof d.server === 'string' ? d.server : undefined,
        imprint:   typeof d.imprint === 'number' ? d.imprint : undefined,
        wildLevel: typeof d.wildLevel === 'number' ? d.wildLevel : undefined,
        tamedLevel:typeof d.tamedLevel === 'number' ? d.tamedLevel : undefined,
        paternalId:typeof d.paternalId === 'number' ? d.paternalId : undefined,
        maternalId:typeof d.maternalId === 'number' ? d.maternalId : undefined,
        partnerId: typeof d.partnerId === 'number' ? d.partnerId : undefined,
        isFounder: d.isFounder === true,
        retired:   d.retired === true,
        colorRegions:        Array.isArray(d.colorRegions) ? (d.colorRegions as unknown[]).map(x => typeof x === 'string' ? x : '') : undefined,
        role:                typeof d.role === 'string' ? d.role : undefined,
        availableForBreeding: d.availableForBreeding === true,
        availableForTrade:    d.availableForTrade === true,
        obtainedFrom:        typeof d.obtainedFrom === 'string' ? d.obtainedFrom : undefined,
        obtainedFromUserId:  typeof d.obtainedFromUserId === 'number' ? d.obtainedFromUserId : undefined,
        cryoLocation:        typeof d.cryoLocation === 'string' ? d.cryoLocation : undefined
    };

    // If obtainedFromUserId points to a real survivor, fetch their display name
    // so we can render the link with a nice label. Falls back to obtainedFrom text.
    let obtainedFromUser: { id: number; nickname: string | null; discordName: string | null } | null = null;
    if (creature.obtainedFromUserId) {
        obtainedFromUser = await db.user.findUnique({
            where: { id: creature.obtainedFromUserId },
            select: { id: true, nickname: true, discordName: true }
        });
    }

    // -- Parents (direct lookup)
    const parentIds = [creature.paternalId, creature.maternalId].filter((x): x is number => typeof x === 'number');
    const parentRows = parentIds.length
        ? await db.creature.findMany({
            where: { id: { in: parentIds }, userId: row.userId },
            select: { id: true, data: true, createdAt: true }
        })
        : [];
    const parents = {
        paternal: parentRows.find(p => p.id === creature.paternalId) ? liteFromRow(parentRows.find(p => p.id === creature.paternalId)!) : null,
        maternal: parentRows.find(p => p.id === creature.maternalId) ? liteFromRow(parentRows.find(p => p.id === creature.maternalId)!) : null
    };

    // -- Offspring (creatures with this id as a parent)
    const offspringRows = await db.creature.findMany({
        where: {
            userId: row.userId,
            OR: [
                { data: { path: ['paternalId'], equals: id } },
                { data: { path: ['maternalId'], equals: id } }
            ]
        },
        select: { id: true, data: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 24
    });
    const offspring = offspringRows.map(liteFromRow);

    // -- Founders: walk lineage up; collect specimens with no parents OR with isFounder flag
    const founders: SpecimenLite[] = [];
    const seen = new Set<number>([id]);
    const queue = [...parentIds];
    const allLineageIds = new Set<number>(parentIds);
    while (queue.length && founders.length < 5) {
        const cur = queue.shift()!;
        if (seen.has(cur)) continue;
        seen.add(cur);
        const r = await db.creature.findUnique({
            where: { id: cur },
            select: { id: true, data: true, createdAt: true, userId: true }
        });
        if (!r || r.userId !== row.userId) continue;
        const lite = liteFromRow(r);
        if (lite.isFounder || (!lite.paternalId && !lite.maternalId)) {
            founders.push(lite);
            continue;
        }
        if (lite.paternalId && !seen.has(lite.paternalId)) { queue.push(lite.paternalId); allLineageIds.add(lite.paternalId); }
        if (lite.maternalId && !seen.has(lite.maternalId)) { queue.push(lite.maternalId); allLineageIds.add(lite.maternalId); }
    }

    // -- Activity events for this creature
    const eventRows = await db.activityEvent.findMany({
        where: {
            userId: row.userId,
            data: { path: ['creatureId'], equals: id }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
    });
    const events = eventRows.map(e => ({
        id: e.id,
        type: e.type,
        data: e.data as Record<string, unknown>,
        createdAt: e.createdAt
    }));

    // -- Viewer's tribe name (used for footer-tribe)
    let userTribeName: string | null = null;
    if (locals.user) {
        const membership = await db.tribeMembership.findFirst({
            where: { userId: locals.user.id, role: { not: 'pending' } },
            include: { tribe: { select: { name: true } } }
        });
        userTribeName = membership?.tribe?.name ?? null;
    }

    // -- Pinned project lookup (if creature is in user.pinnedCreatures)
    // pinnedCreatures is either an array of ids (legacy) or an array/object of entries with focus/targetMutations.
    let pinnedProject: PinnedProject | null = null;
    const existingPinIds: number[] = [];
    const rawPinned = row.user.pinnedCreatures;
    if (Array.isArray(rawPinned)) {
        for (const entry of rawPinned as unknown[]) {
            if (typeof entry === 'number') {
                existingPinIds.push(entry);
                if (entry === id) pinnedProject = { creatureId: id };
            } else if (entry && typeof entry === 'object') {
                const e = entry as Record<string, unknown>;
                const eid = typeof e.creatureId === 'number' ? e.creatureId : (typeof e.id === 'number' ? e.id : null);
                if (eid != null) {
                    existingPinIds.push(eid);
                    if (eid === id) {
                        pinnedProject = {
                            creatureId: id,
                            focusStat: typeof e.focusStat === 'string' ? e.focusStat : (typeof e.focus === 'string' ? e.focus : undefined),
                            targetMutations: typeof e.targetMutations === 'number' ? e.targetMutations : undefined
                        };
                    }
                }
            }
        }
    }

    // -- Viewer's vault for Set Partner picker (only loaded for owner)
    let vaultLite: SpecimenLite[] = [];
    if (locals.user?.id === row.userId) {
        const vaultRows = await db.creature.findMany({
            where: { userId: row.userId, NOT: { id } },
            select: { id: true, data: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        vaultLite = vaultRows.map(liteFromRow);
    }

    return {
        creature,
        rawData: d, // full original data blob — used when PUT-updating to preserve unknown fields
        owner: { id: row.user.id, nickname: row.user.nickname, discordName: row.user.discordName },
        isOwner: locals.user?.id === row.userId,
        parents,
        offspring,
        founders,
        events,
        userTribeName,
        pinnedProject,
        existingPinIds,
        vault: vaultLite,
        totalMuts: totalMutCount(creature.mutations),
        obtainedFromUser
    };
};
