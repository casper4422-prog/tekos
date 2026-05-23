import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import type { Stats } from '$lib/badges';

export type VaultCreature = {
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
    availableForBreeding?: boolean;
    availableForTrade?: boolean;
};

export const load: PageServerLoad = async ({ locals }) => {
    // Guest mode — empty vault, page uses localStorage client-side
    if (!locals.user) return { creatures: [] as VaultCreature[], myTribeId: null as number | null };

    const [rows, membership] = await Promise.all([
        db.creature.findMany({
            where: { userId: locals.user.id },
            orderBy: { createdAt: 'desc' }
        }),
        // Drives the visibility of the per-card "Send to Tribe Vault" button —
        // hidden entirely when the user isn't in a tribe.
        db.tribeMembership.findFirst({
            where: { userId: locals.user.id },
            select: { tribeId: true }
        })
    ]);

    const creatures: VaultCreature[] = rows.map(r => {
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
            availableForBreeding: d.availableForBreeding === true,
            availableForTrade:    d.availableForTrade === true
        };
    });

    return { creatures, myTribeId: membership?.tribeId ?? null };
};
