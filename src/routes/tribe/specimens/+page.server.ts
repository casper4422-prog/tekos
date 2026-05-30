import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import type { Stats } from '$lib/badges';

export type TribeVaultCreature = {
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
    creator: { id: number; nickname: string | null; discordName: string | null; email: string };
};

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login?next=/tribe/specimens');

    const membership = await db.tribeMembership.findFirst({
        where: { userId: locals.user.id },
        select: { tribeId: true, role: true, tribe: { select: { id: true, name: true } } }
    });
    if (!membership) {
        return { inTribe: false, role: null, tribeName: null, myId: locals.user.id, creatures: [] as TribeVaultCreature[] };
    }

    const rows = await db.tribeCreature.findMany({
        where: { tribeId: membership.tribeId },
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { id: true, nickname: true, discordName: true, email: true } } }
    });

    const creatures: TribeVaultCreature[] = rows.map(r => {
        const d = r.data as Record<string, unknown>;
        return {
            id:        r.id,
            createdAt: r.createdAt,
            name:      String(d.name ?? 'Unnamed'),
            species:   String(d.species ?? 'Unknown'),
            level:     Number(d.level ?? 1),
            gender:    String(d.gender ?? 'Unknown'),
            baseStats: (d.baseStats as Stats) ?? {},
            mutations: (d.mutations as Stats) ?? {},
            notes:     typeof d.notes === 'string' ? d.notes : undefined,
            server:    typeof d.server === 'string' ? d.server : undefined,
            creator:   r.creator
        };
    });

    return {
        inTribe: true,
        role: membership.role,
        tribeName: membership.tribe.name,
        myId: locals.user.id,
        creatures
    };
};
