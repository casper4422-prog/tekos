import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) return { ownedBySpecies: {} as Record<string, number> };
    const creatures = await db.creature.findMany({
        where: { userId: locals.user.id },
        select: { data: true }
    });
    const owned: Record<string, number> = {};
    for (const c of creatures) {
        const sp = String((c.data as { species?: string } | null)?.species ?? '').trim();
        if (!sp) continue;
        owned[sp] = (owned[sp] ?? 0) + 1;
    }
    return { ownedBySpecies: owned };
};
