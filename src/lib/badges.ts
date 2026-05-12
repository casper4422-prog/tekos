/**
 * Badge computation — derives TekOS badges from a creature's stats.
 *
 * Three systems (from achievements_system.md):
 *  1. Prize Bloodline (base stats only, min of HP/STA/FOOD/WGT/MEL):
 *     Bronze 45 / Silver 50 / Gold 55 / Diamond 60
 *  2. Boss Ready (total = base + mut*2, requires HP AND MEL):
 *     Gamma 75 / Beta 100 / Alpha 125 / Titan 150
 *  3. Role badges:
 *     Tank: HP >= 175 (alone)
 *     DPS:  MEL >= 175 (alone)
 *     Bruiser: HP >= 125 AND WGT >= 125
 *     Runner: HP >= 100 AND SPD >= 150
 */

export type Stats = Record<string, number>;

export type BloodlineTier = 'diamond' | 'gold' | 'silver' | 'bronze' | null;
export type BossTier      = 'titan' | 'alpha' | 'beta' | 'gamma' | null;
export type RoleBadge     = 'tank' | 'dps' | 'bruiser' | 'runner';

export type CreatureBadges = {
    bloodline: BloodlineTier;
    bossReady: BossTier;
    roles:     RoleBadge[];
};

function n(s: Stats | undefined, k: string) {
    if (!s) return 0;
    // Stats can be stored as 'Health' or 'HP' depending on entry source — normalize.
    return s[k] ?? s[k.toLowerCase()] ?? 0;
}

export function getStat(s: Stats | undefined, key: 'HP'|'STA'|'OXY'|'FOOD'|'WGT'|'MEL'|'CRA'|'SPD'): number {
    if (!s) return 0;
    const aliases: Record<string, string[]> = {
        HP:   ['HP', 'Health', 'health'],
        STA:  ['STA', 'Stamina', 'stamina'],
        OXY:  ['OXY', 'Oxygen', 'oxygen'],
        FOOD: ['FOOD', 'Food', 'food'],
        WGT:  ['WGT', 'Weight', 'weight'],
        MEL:  ['MEL', 'Melee', 'melee'],
        CRA:  ['CRA', 'Crafting', 'crafting', 'CraftingSpeed'],
        SPD:  ['SPD', 'Speed', 'speed', 'MovementSpeed']
    };
    for (const a of aliases[key]) {
        const v = s[a];
        if (typeof v === 'number') return v;
    }
    return 0;
}

function totalStat(base: Stats | undefined, mut: Stats | undefined, key: Parameters<typeof getStat>[1]) {
    return getStat(base, key) + getStat(mut, key) * 2;
}

export function computeBadges(base: Stats | undefined, mut: Stats | undefined): CreatureBadges {
    // Bloodline (base only)
    const minCore = Math.min(
        getStat(base, 'HP'),
        getStat(base, 'STA'),
        getStat(base, 'FOOD'),
        getStat(base, 'WGT'),
        getStat(base, 'MEL')
    );
    let bloodline: BloodlineTier = null;
    if (minCore >= 60) bloodline = 'diamond';
    else if (minCore >= 55) bloodline = 'gold';
    else if (minCore >= 50) bloodline = 'silver';
    else if (minCore >= 45) bloodline = 'bronze';

    // Boss Ready (total = base + mut*2, BOTH HP and MEL)
    const tHP  = totalStat(base, mut, 'HP');
    const tMEL = totalStat(base, mut, 'MEL');
    const tWGT = totalStat(base, mut, 'WGT');
    const tSPD = totalStat(base, mut, 'SPD');
    const minBoss = Math.min(tHP, tMEL);
    let bossReady: BossTier = null;
    if (minBoss >= 150) bossReady = 'titan';
    else if (minBoss >= 125) bossReady = 'alpha';
    else if (minBoss >= 100) bossReady = 'beta';
    else if (minBoss >= 75)  bossReady = 'gamma';

    // Role badges
    const roles: RoleBadge[] = [];
    if (tHP >= 175) roles.push('tank');
    if (tMEL >= 175) roles.push('dps');
    if (tHP >= 125 && tWGT >= 125) roles.push('bruiser');
    if (tHP >= 100 && tSPD >= 150) roles.push('runner');

    return { bloodline, bossReady, roles };
}

/** Total badge count for a single creature (across all 3 systems). */
export function badgeCountForCreature(base: Stats | undefined, mut: Stats | undefined): number {
    const b = computeBadges(base, mut);
    return (b.bloodline ? 1 : 0) + (b.bossReady ? 1 : 0) + b.roles.length;
}

/** Aggregate badge count across a Vault — counts UNIQUE badge x species combinations,
 * since the Badge Wall shows one entry per badge+species earned. */
export function aggregateBadgesByCategory(creatures: Array<{ species: string; baseStats?: Stats; mutations?: Stats }>) {
    const bloodline = new Map<string, BloodlineTier>(); // species -> highest tier
    const bossReady = new Map<string, BossTier>();
    const roles = new Map<string, Set<RoleBadge>>();

    for (const c of creatures) {
        const b = computeBadges(c.baseStats, c.mutations);
        const sp = c.species || 'Unknown';

        if (b.bloodline) {
            const order = { bronze: 1, silver: 2, gold: 3, diamond: 4 } as const;
            const cur = bloodline.get(sp);
            if (!cur || order[b.bloodline] > order[cur as keyof typeof order]) bloodline.set(sp, b.bloodline);
        }
        if (b.bossReady) {
            const order = { gamma: 1, beta: 2, alpha: 3, titan: 4 } as const;
            const cur = bossReady.get(sp);
            if (!cur || order[b.bossReady] > order[cur as keyof typeof order]) bossReady.set(sp, b.bossReady);
        }
        for (const role of b.roles) {
            if (!roles.has(sp)) roles.set(sp, new Set());
            roles.get(sp)!.add(role);
        }
    }

    return {
        bloodline: Array.from(bloodline.entries()).map(([species, tier]) => ({ species, tier })),
        bossReady: Array.from(bossReady.entries()).map(([species, tier]) => ({ species, tier })),
        roles: Array.from(roles.entries()).flatMap(([species, set]) =>
            Array.from(set).map(role => ({ species, role }))
        )
    };
}
