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
};

export const load: PageServerLoad = async ({ params, locals }) => {
    const id = parseInt(params.id);
    if (!Number.isFinite(id)) throw error(404, 'Specimen not found');

    const row = await db.creature.findUnique({
        where: { id },
        include: { user: { select: { id: true, nickname: true, email: true } } }
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
        server:    typeof d.server === 'string' ? d.server : undefined
    };

    return {
        creature,
        owner: row.user,
        isOwner: locals.user?.id === row.userId
    };
};
