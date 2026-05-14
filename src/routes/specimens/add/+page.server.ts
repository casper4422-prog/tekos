import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

type Srv = { name: string; map?: string; code?: string };

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) return { vault: [], founders: [], servers: [] as Srv[] };
    const [rows, user] = await Promise.all([
        db.creature.findMany({
            where: { userId: locals.user.id },
            select: { id: true, data: true },
            orderBy: { createdAt: 'desc' }
        }),
        db.user.findUnique({
            where: { id: locals.user.id },
            select: { settings: true, pinnedCreatures: true }
        })
    ]);
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

    // Servers come from two possible places — Settings → Cluster (preferred) and the older
    // feed-page convention. Merge by name.
    const settings = (user?.settings ?? {}) as Record<string, unknown>;
    const cluster  = (settings.cluster ?? {}) as Record<string, unknown>;
    const fromSettings = Array.isArray(cluster.servers) ? (cluster.servers as Record<string, unknown>[]) : [];
    const pinned = (user?.pinnedCreatures ?? {}) as Record<string, unknown> | unknown[];
    const fromFeed = !Array.isArray(pinned) && Array.isArray((pinned as Record<string, unknown>).servers)
        ? ((pinned as Record<string, unknown>).servers as Record<string, unknown>[])
        : [];

    const byName = new Map<string, Srv>();
    for (const s of [...fromSettings, ...fromFeed]) {
        const name = String(s.name ?? '').trim();
        if (!name) continue;
        if (!byName.has(name)) byName.set(name, {
            name,
            map: typeof s.map === 'string' ? s.map : undefined,
            code: typeof s.code === 'string' ? s.code : undefined
        });
    }
    const servers: Srv[] = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));

    return { vault, founders, servers };
};
