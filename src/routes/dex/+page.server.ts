import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { aggregateBadgesByCategory, type Stats } from '$lib/badges';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        return {
            ownedBySpecies: {} as Record<string, number>,
            badgedSpecies: [] as string[]
        };
    }
    const creatures = await db.creature.findMany({
        where: { userId: locals.user.id },
        select: { data: true }
    });
    const shaped = creatures.map(c => {
        const d = c.data as { species?: string; baseStats?: Stats; mutations?: Stats } | null;
        return {
            species: String(d?.species ?? '').trim(),
            baseStats: d?.baseStats ?? {},
            mutations: d?.mutations ?? {}
        };
    }).filter(c => c.species);

    const owned: Record<string, number> = {};
    for (const c of shaped) owned[c.species] = (owned[c.species] ?? 0) + 1;

    // Species the user has earned at least one badge for (any system)
    const wall = aggregateBadgesByCategory(shaped);
    const badged = new Set<string>();
    for (const b of wall.bloodline) badged.add(b.species);
    for (const b of wall.bossReady) badged.add(b.species);
    for (const b of wall.roles)     badged.add(b.species);
    for (const b of wall.underdog)  badged.add(b.species);

    return { ownedBySpecies: owned, badgedSpecies: Array.from(badged) };
};
