import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { computeBadges, getStat, aggregateBadgesByCategory, type Stats } from '$lib/badges';

/**
 * Breeder Rank ladder (from achievements_system.md):
 *  1. Apprentice  — first Bronze Bloodline
 *  2. Journeyman  — Bronze on 5 species
 *  3. Expert      — first Silver Bloodline
 *  4. Master      — first Gold Bloodline
 *  5. Grandmaster — Gold on 3 species
 *  6. Legend      — first Diamond Bloodline
 *  7. Myth        — Diamond on multiple species (2+)
 */
function computeBreederRank(bloodlineEntries: Array<{ species: string; tier: 'bronze'|'silver'|'gold'|'diamond' }>) {
    const bronzeSpecies  = new Set(bloodlineEntries.filter(b => b.tier === 'bronze').map(b => b.species));
    const silverSpecies  = new Set(bloodlineEntries.filter(b => b.tier === 'silver').map(b => b.species));
    const goldSpecies    = new Set(bloodlineEntries.filter(b => b.tier === 'gold').map(b => b.species));
    const diamondSpecies = new Set(bloodlineEntries.filter(b => b.tier === 'diamond').map(b => b.species));

    const ladder = [
        { id: 'apprentice',  name: 'Apprentice',  achieved: bronzeSpecies.size >= 1 },
        { id: 'journeyman',  name: 'Journeyman',  achieved: bronzeSpecies.size >= 5 },
        { id: 'expert',      name: 'Expert',      achieved: silverSpecies.size >= 1 },
        { id: 'master',      name: 'Master',      achieved: goldSpecies.size   >= 1 },
        { id: 'grandmaster', name: 'Grandmaster', achieved: goldSpecies.size   >= 3 },
        { id: 'legend',      name: 'Legend',      achieved: diamondSpecies.size >= 1 },
        { id: 'myth',        name: 'Myth',        achieved: diamondSpecies.size >= 2 }
    ];
    const currentIdx = ladder.reduce((idx, step, i) => (step.achieved ? i : idx), -1);
    const current = currentIdx >= 0 ? ladder[currentIdx] : null;
    const next    = currentIdx + 1 < ladder.length ? ladder[currentIdx + 1] : null;

    // Compute progress to next rank
    let progressLabel = '';
    let progressPct = 0;
    if (next?.id === 'journeyman') {
        progressLabel = `${bronzeSpecies.size} / 5 species with Bronze`;
        progressPct = Math.min(100, (bronzeSpecies.size / 5) * 100);
    } else if (next?.id === 'expert') {
        progressLabel = 'First Silver Bloodline on any species';
        progressPct = silverSpecies.size > 0 ? 100 : 0;
    } else if (next?.id === 'master') {
        progressLabel = 'First Gold Bloodline on any species';
        progressPct = goldSpecies.size > 0 ? 100 : 0;
    } else if (next?.id === 'grandmaster') {
        progressLabel = `${goldSpecies.size} / 3 species with Gold`;
        progressPct = Math.min(100, (goldSpecies.size / 3) * 100);
    } else if (next?.id === 'legend') {
        progressLabel = 'First Diamond Bloodline';
        progressPct = diamondSpecies.size > 0 ? 100 : 0;
    } else if (next?.id === 'myth') {
        progressLabel = `${diamondSpecies.size} / 2 species with Diamond`;
        progressPct = Math.min(100, (diamondSpecies.size / 2) * 100);
    }

    return { ladder, current, next, progressLabel, progressPct };
}

type CreatureLite = {
    id: number;
    name: string;
    species: string;
    baseStats: Stats;
    mutations: Stats;
};

/**
 * Close-to-earning — for each unearned standard badge, find the user's closest creature
 * and compute the stat gap.
 */
function computeClose(creatures: CreatureLite[]) {
    const out: Array<{
        badge: string;
        tier:  string;
        category: string;
        creatureId: number;
        creatureName: string;
        species: string;
        statKey: string;
        gap: number;
        progressPct: number;
    }> = [];

    function bestForBoth(thresh: number) {
        let best: { c: CreatureLite; gap: number; statKey: string } | null = null;
        for (const c of creatures) {
            const hp  = getStat(c.baseStats, 'HP') + getStat(c.mutations, 'HP') * 2;
            const mel = getStat(c.baseStats, 'MEL') + getStat(c.mutations, 'MEL') * 2;
            const min = Math.min(hp, mel);
            if (min >= thresh) continue; // already earned
            const gap = thresh - min;
            const statKey = hp < mel ? 'HP' : 'MEL';
            if (!best || gap < best.gap) best = { c, gap, statKey };
        }
        return best;
    }

    function bestForBloodline(thresh: number) {
        let best: { c: CreatureLite; gap: number; statKey: string } | null = null;
        for (const c of creatures) {
            const stats = (['HP','STA','FOOD','WGT','MEL'] as const).map(k => ({ k, v: getStat(c.baseStats, k) }));
            const min = Math.min(...stats.map(s => s.v));
            if (min >= thresh) continue;
            const weakest = stats.reduce((a, b) => (a.v < b.v ? a : b));
            const gap = thresh - weakest.v;
            if (!best || gap < best.gap) best = { c, gap, statKey: weakest.k };
        }
        return best;
    }

    const checks: Array<{
        badge: string; tier: string; category: string;
        bestFn: () => ReturnType<typeof bestForBoth>;
        thresh: number;
    }> = [
        { badge: 'Gamma Ready',  tier: 'gamma',  category: 'Boss Ready',      bestFn: () => bestForBoth(75),   thresh: 75 },
        { badge: 'Beta Ready',   tier: 'beta',   category: 'Boss Ready',      bestFn: () => bestForBoth(100),  thresh: 100 },
        { badge: 'Alpha Ready',  tier: 'alpha',  category: 'Boss Ready',      bestFn: () => bestForBoth(125),  thresh: 125 },
        { badge: 'Titan Slayer', tier: 'titan',  category: 'Boss Ready',      bestFn: () => bestForBoth(150),  thresh: 150 },
        { badge: 'Bronze Bloodline',  tier: 'bronze',  category: 'Prize Bloodline', bestFn: () => bestForBloodline(45), thresh: 45 },
        { badge: 'Silver Bloodline',  tier: 'silver',  category: 'Prize Bloodline', bestFn: () => bestForBloodline(50), thresh: 50 },
        { badge: 'Gold Bloodline',    tier: 'gold',    category: 'Prize Bloodline', bestFn: () => bestForBloodline(55), thresh: 55 },
        { badge: 'Diamond Bloodline', tier: 'diamond', category: 'Prize Bloodline', bestFn: () => bestForBloodline(60), thresh: 60 }
    ];

    for (const check of checks) {
        const best = check.bestFn();
        if (!best) continue;
        out.push({
            badge: check.badge,
            tier: check.tier,
            category: check.category,
            creatureId: best.c.id,
            creatureName: best.c.name,
            species: best.c.species,
            statKey: best.statKey,
            gap: best.gap,
            progressPct: Math.max(0, Math.min(100, ((check.thresh - best.gap) / check.thresh) * 100))
        });
    }

    // Sort by smallest gap, take top 5
    return out.sort((a, b) => a.gap - b.gap).slice(0, 5);
}

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        return {
            badgeWall: { bloodline: [], bossReady: [], roles: [] },
            close: [],
            rank: { ladder: [], current: null, next: null, progressLabel: '', progressPct: 0 },
            totals: { earned: 0, diamond: 0, gold: 0, silver: 0, bronze: 0 }
        };
    }

    const creatureRows = await db.creature.findMany({
        where: { userId: locals.user.id },
        select: { id: true, data: true }
    });

    const creatures: CreatureLite[] = creatureRows.map(r => {
        const d = r.data as Record<string, unknown>;
        return {
            id: r.id,
            name:    String(d.name ?? 'Unnamed'),
            species: String(d.species ?? 'Unknown'),
            baseStats: (d.baseStats as Stats) ?? {},
            mutations: (d.mutations as Stats) ?? {}
        };
    });

    const badgeWall = aggregateBadgesByCategory(creatures);
    const close = computeClose(creatures);

    // Compute breeder rank
    const bloodlineEntries = badgeWall.bloodline as Array<{ species: string; tier: 'bronze'|'silver'|'gold'|'diamond' }>;
    const rank = computeBreederRank(bloodlineEntries);

    // Totals
    const totals = {
        earned:  badgeWall.bloodline.length + badgeWall.bossReady.length + badgeWall.roles.length,
        diamond: badgeWall.bloodline.filter(b => b.tier === 'diamond').length,
        gold:    badgeWall.bloodline.filter(b => b.tier === 'gold').length,
        silver:  badgeWall.bloodline.filter(b => b.tier === 'silver').length,
        bronze:  badgeWall.bloodline.filter(b => b.tier === 'bronze').length
    };

    return { badgeWall, close, rank, totals };
};
