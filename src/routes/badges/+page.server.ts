import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { computeBadges, getStat, aggregateBadgesByCategory, type Stats } from '$lib/badges';
import { computeMapBossBadges, MAP_BOSSES, ULTIMATE_BADGES, SPECIAL_ACHIEVEMENTS, type BossTier } from '$lib/mapBosses';

/**
 * Breeder Rank ladder — 8 ranks:
 *  1. Beach Bob         — first Bronze Bloodline
 *  2. Primitive Tamer   — Bronze on 5 species
 *  3. Bloodline Keeper  — first Silver Bloodline
 *  4. Mutation Hunter   — Silver on 5 species
 *  5. Alpha Line        — first Gold Bloodline
 *  6. Element Forged    — Gold on 5 species
 *  7. Ascendant         — first Diamond Bloodline
 *  8. Homo Deus         — Diamond on 5 species
 */
function computeBreederRank(bloodlineEntries: Array<{ species: string; tier: 'bronze'|'silver'|'gold'|'diamond' }>) {
    const bronzeSpecies  = new Set(bloodlineEntries.filter(b => b.tier === 'bronze').map(b => b.species));
    const silverSpecies  = new Set(bloodlineEntries.filter(b => b.tier === 'silver').map(b => b.species));
    const goldSpecies    = new Set(bloodlineEntries.filter(b => b.tier === 'gold').map(b => b.species));
    const diamondSpecies = new Set(bloodlineEntries.filter(b => b.tier === 'diamond').map(b => b.species));

    const ladder = [
        { id: 'beach_bob',       name: 'Beach Bob',       achieved: bronzeSpecies.size  >= 1 },
        { id: 'primitive_tamer', name: 'Primitive Tamer', achieved: bronzeSpecies.size  >= 5 },
        { id: 'bloodline_keeper', name: 'Bloodline Keeper', achieved: silverSpecies.size  >= 1 },
        { id: 'mutation_hunter', name: 'Mutation Hunter', achieved: silverSpecies.size  >= 5 },
        { id: 'alpha_line',      name: 'Alpha Line',      achieved: goldSpecies.size    >= 1 },
        { id: 'element_forged',  name: 'Element Forged',  achieved: goldSpecies.size    >= 5 },
        { id: 'ascendant',       name: 'Ascendant',       achieved: diamondSpecies.size >= 1 },
        { id: 'homo_deus',       name: 'Homo Deus',       achieved: diamondSpecies.size >= 5 }
    ];
    const currentIdx = ladder.reduce((idx, step, i) => (step.achieved ? i : idx), -1);
    const current = currentIdx >= 0 ? ladder[currentIdx] : null;
    const next    = currentIdx + 1 < ladder.length ? ladder[currentIdx + 1] : null;

    // Compute progress to next rank
    let progressLabel = '';
    let progressPct = 0;
    if (next?.id === 'primitive_tamer') {
        progressLabel = `${bronzeSpecies.size} / 5 species with Bronze`;
        progressPct = Math.min(100, (bronzeSpecies.size / 5) * 100);
    } else if (next?.id === 'bloodline_keeper') {
        progressLabel = 'First Silver Bloodline on any species';
        progressPct = silverSpecies.size > 0 ? 100 : 0;
    } else if (next?.id === 'mutation_hunter') {
        progressLabel = `${silverSpecies.size} / 5 species with Silver`;
        progressPct = Math.min(100, (silverSpecies.size / 5) * 100);
    } else if (next?.id === 'alpha_line') {
        progressLabel = 'First Gold Bloodline on any species';
        progressPct = goldSpecies.size > 0 ? 100 : 0;
    } else if (next?.id === 'element_forged') {
        progressLabel = `${goldSpecies.size} / 5 species with Gold`;
        progressPct = Math.min(100, (goldSpecies.size / 5) * 100);
    } else if (next?.id === 'ascendant') {
        progressLabel = 'First Diamond Bloodline on any species';
        progressPct = diamondSpecies.size > 0 ? 100 : 0;
    } else if (next?.id === 'homo_deus') {
        progressLabel = `${diamondSpecies.size} / 5 species with Diamond`;
        progressPct = Math.min(100, (diamondSpecies.size / 5) * 100);
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
            const hp  = getStat(c.baseStats, 'HP') + getStat(c.mutations, 'HP');
            const mel = getStat(c.baseStats, 'MEL') + getStat(c.mutations, 'MEL');
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

/**
 * For each Boss Ready / Underdog tier, find the user's best in-progress specimen (one that
 * does NOT meet the threshold but is closest). Used to render `.badge-progress-line` on
 * locked tier cards.
 */
function computeBestInProgress(creatures: CreatureLite[]) {
    type Best = { creatureId: number; name: string; species: string; hp: number; mel: number; minStat: number };
    const out: Record<string, Best | null> = {};

    function bestBelow(thresh: number, filterSpecies?: (s: string) => boolean): Best | null {
        let best: Best | null = null;
        for (const c of creatures) {
            if (filterSpecies && !filterSpecies(c.species)) continue;
            const hp  = getStat(c.baseStats, 'HP') + getStat(c.mutations, 'HP');
            const mel = getStat(c.baseStats, 'MEL') + getStat(c.mutations, 'MEL');
            const min = Math.min(hp, mel);
            if (min >= thresh) continue;
            if (!best || min > best.minStat) {
                best = { creatureId: c.id, name: c.name, species: c.species, hp, mel, minStat: min };
            }
        }
        return best;
    }

    const bossThresholds: Record<string, number> = { gamma: 75, beta: 100, alpha: 125, titan: 150 };
    for (const [tier, thresh] of Object.entries(bossThresholds)) {
        out[`boss_${tier}`] = bestBelow(thresh);
    }

    return out;
}

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        return {
            badgeWall: { bloodline: [], bossReady: [], roles: [], underdog: [] },
            close: [],
            rank: { ladder: [], current: null, next: null, progressLabel: '', progressPct: 0 },
            totals: { earned: 0, diamond: 0, gold: 0, silver: 0, bronze: 0 },
            bossRecords: [] as Array<{ bossName: string; mapName: string | null; outcome: string }>,
            mapBossEarned: {} as Record<string, { earned: boolean; reason?: string }>,
            ultimateEarned: {} as Record<string, { earned: boolean; reason?: string }>,
            specialEarned: {} as Record<string, { earned: boolean; current: number; target: number; reason?: string }>,
            bestInProgress: {} as Record<string, { creatureId: number; name: string; species: string; hp: number; mel: number; minStat: number } | null>
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

    const bossRecordRows = await db.bossRecord.findMany({
        where: { userId: locals.user.id },
        select: { bossName: true, mapName: true, outcome: true }
    });
    const bossRecords = bossRecordRows.map(r => ({
        bossName: r.bossName,
        mapName: r.mapName ?? null,
        outcome: r.outcome
    }));

    const badgeWall = aggregateBadgesByCategory(creatures);

    // Per-creature stats fed into map-boss eligibility: species-specific badges need to know
    // which creature qualifies (e.g. Broodmother requires a Megatherium at Alpha), and the
    // stamina-floored badges need that creature's actual STA total.
    const tierOrder = { gamma: 1, beta: 2, alpha: 3, titan: 4 } as const;
    const highestBossTierBySpecies = new Map<string, 'gamma'|'beta'|'alpha'|'titan'>();
    const creatureStats: Array<{ species: string; bossTier: BossTier | null; staTotal: number }> = [];
    for (const c of creatures) {
        const b = computeBadges(c.baseStats, c.mutations, c.species);
        const staTotal = getStat(c.baseStats, 'STA') + getStat(c.mutations, 'STA');
        creatureStats.push({ species: c.species, bossTier: b.bossReady, staTotal });
        if (!b.bossReady) continue;
        const cur = highestBossTierBySpecies.get(c.species);
        if (!cur || tierOrder[b.bossReady] > tierOrder[cur]) {
            highestBossTierBySpecies.set(c.species, b.bossReady);
        }
    }

    const mapBossEarnedMap = computeMapBossBadges(bossRecords, creatureStats);
    const mapBossEarned: Record<string, { earned: boolean; reason?: string }> = {};
    for (const [k, v] of mapBossEarnedMap) mapBossEarned[k] = v;

    // Ultimate badges — derive from mapBossEarned + bossReady
    const ultimateEarned: Record<string, { earned: boolean; reason?: string }> = {};
    const islandBosses = MAP_BOSSES.filter(b => b.map === 'island');
    const islandWonCount = islandBosses.filter(b => mapBossEarnedMap.get(b.id)?.earned).length;
    const titanSpeciesCount = Array.from(highestBossTierBySpecies.values()).filter(t => t === 'titan').length;

    // Pruned to the 3 released story maps that have badges in the trimmed roster
    // (Extinction + Genesis came out with the broader Map Boss cull).
    const storyMaps: Array<'island'|'scorched'|'aberration'> = ['island','scorched','aberration'];
    const storyMapsCleared = storyMaps.filter(map => {
        const inMap = MAP_BOSSES.filter(b => b.map === map);
        return inMap.length > 0 && inMap.every(b => mapBossEarnedMap.get(b.id)?.earned);
    }).length;
    const totalMapBosses = MAP_BOSSES.length;
    const totalMapBossesWon = MAP_BOSSES.filter(b => mapBossEarnedMap.get(b.id)?.earned).length;

    for (const u of ULTIMATE_BADGES) {
        if (u.id === 'overseer') {
            ultimateEarned[u.id] = { earned: islandWonCount === islandBosses.length && islandBosses.length > 0, reason: `${islandWonCount}/${islandBosses.length} Island bosses cleared` };
        } else if (u.id === 'ascension') {
            ultimateEarned[u.id] = { earned: storyMapsCleared === storyMaps.length, reason: `${storyMapsCleared}/${storyMaps.length} story maps` };
        } else if (u.id === 'world') {
            ultimateEarned[u.id] = { earned: totalMapBossesWon === totalMapBosses && totalMapBosses > 0, reason: `${totalMapBossesWon}/${totalMapBosses} bosses across the network` };
        } else if (u.id === 'perfect') {
            ultimateEarned[u.id] = { earned: titanSpeciesCount >= 10, reason: `${titanSpeciesCount} species at Titan tier` };
        } else if (u.id === 'frostbite') {
            const nunatakWon = mapBossEarnedMap.get('nunatak')?.earned ?? false;
            ultimateEarned[u.id] = { earned: nunatakWon && titanSpeciesCount > 0, reason: nunatakWon ? 'Nunatak cleared' : 'Locked behind Nunatak Slayer' };
        } else if (u.id === 'ragnarok') {
            ultimateEarned[u.id] = { earned: false, reason: 'A legendary challenge' };
        } else {
            ultimateEarned[u.id] = { earned: false };
        }
    }

    // Special Achievements (Prize Bloodline)
    const specialEarned: Record<string, { earned: boolean; current: number; target: number; reason?: string }> = {};
    const diamondSpeciesCount = badgeWall.bloodline.filter(b => b.tier === 'diamond').length;
    const bossReadySpeciesCount = new Set(badgeWall.bossReady.map(b => b.species)).size;
    for (const s of SPECIAL_ACHIEVEMENTS) {
        if (s.id === 'diversity') {
            specialEarned[s.id] = { earned: bossReadySpeciesCount >= s.target, current: bossReadySpeciesCount, target: s.target };
        } else if (s.id === 'collection') {
            specialEarned[s.id] = { earned: diamondSpeciesCount >= s.target, current: diamondSpeciesCount, target: s.target };
        } else if (s.id === 'underdog') {
            specialEarned[s.id] = { earned: false, current: 0, target: s.target, reason: 'NOT STARTED' };
        } else if (s.id === 'community') {
            specialEarned[s.id] = { earned: false, current: 0, target: s.target, reason: '0 / 10 tribes credited' };
        } else {
            specialEarned[s.id] = { earned: false, current: 0, target: s.target };
        }
    }

    const close = computeClose(creatures);
    const bestInProgress = computeBestInProgress(creatures);

    // Compute breeder rank
    const bloodlineEntries = badgeWall.bloodline as Array<{ species: string; tier: 'bronze'|'silver'|'gold'|'diamond' }>;
    const rank = computeBreederRank(bloodlineEntries);

    // Totals
    const totals = {
        earned:  badgeWall.bloodline.length + badgeWall.bossReady.length + badgeWall.roles.length + badgeWall.underdog.length,
        diamond: badgeWall.bloodline.filter(b => b.tier === 'diamond').length,
        gold:    badgeWall.bloodline.filter(b => b.tier === 'gold').length,
        silver:  badgeWall.bloodline.filter(b => b.tier === 'silver').length,
        bronze:  badgeWall.bloodline.filter(b => b.tier === 'bronze').length
    };

    return { badgeWall, close, rank, totals, bossRecords, mapBossEarned, ultimateEarned, specialEarned, bestInProgress };
};
