import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) return { vault: [], founders: [] };
    const rows = await db.creature.findMany({
        where: { userId: locals.user.id },
        select: { id: true, data: true },
        orderBy: { createdAt: 'desc' }
    });
    const vault = rows.map(r => {
        const d = (r.data ?? {}) as Record<string, unknown>;
        return {
            id: r.id,
            name:    String(d.name ?? ''),
            species: String(d.species ?? ''),
            gender:  String(d.gender ?? ''),
            isFounder: Boolean(d.isFounder)
        };
    });
    const founders = vault.filter(v => v.isFounder);
    return { vault, founders };
};
