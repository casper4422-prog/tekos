/**
 * Badge computation — derives TekOS badges from a creature's stats.
 *
 * IMPORTANT — Mutation math (changed 2026-05):
 *   The `mutations` field holds the TOTAL mutation LEVELS for each stat,
 *   not the count of mutation events. Survivors enter this manually based
 *   on what their UI shows. So the total is a simple addition:
 *       total = base + mutationLevels  (no ×2 multiplier)
 *   Example: Rex with base HP 70 and 10 mutation levels → 80 total HP.
 *
 * Three systems:
 *  1. Prize Bloodline — base stats only (no mutations, no domestic levels),
 *     min of HP/STA/FOOD/WGT/MEL: Bronze 45 / Silver 50 / Gold 55 / Diamond 60
 *  2. Boss Ready — total = base + mutation levels, requires HP AND MEL:
 *     Gamma 75 / Beta 100 / Alpha 125 / Titan 150
 *  3. Role badges (use total = base + mutation levels):
 *     Tank: HP >= 175 (alone)
 *     DPS:  MEL >= 175 (alone)
 *     Bruiser: HP >= 125 AND WGT >= 125
 *     Runner: HP >= 100 AND SPD >= 150
 *  4. Underdog (non-meta species, total = base + mutation levels):
 *     Champion 90 / Hero 115 / Legend 140 / Titan 160
 */

export type Stats = Record<string, number>;

export type BloodlineTier  = 'diamond' | 'gold' | 'silver' | 'bronze' | null;
export type BossTier       = 'titan' | 'alpha' | 'beta' | 'gamma' | null;
export type RoleBadge      = 'tank' | 'dps' | 'bruiser' | 'runner';
export type UnderdogTier   = 'titan' | 'legend' | 'hero' | 'champion' | null;
export type UnderdogCategory = 'heavy' | 'tank' | 'aerial' | 'aquatic' | null;

export type CreatureBadges = {
    bloodline: BloodlineTier;
    bossReady: BossTier;
    roles:     RoleBadge[];
    underdog:  UnderdogTier;
};

// Species already considered "boss meta" — excluded from Underdog system.
export const UNDERDOG_META_EXCLUDE = new Set<string>([
    'Rex','Giga','Giganotosaurus','Carcharo','Carcharodontosaurus','Therizino','Therizinosaurus',
    'Deinonychus','Megatherium','Yutyrannus','Daeodon','Woolly Rhino','Wooly Rhino','Shadowmane',
    'Reaper','Reaper King','Reaper Queen','Rock Drake','Megalosaurus','Spino','Spinosaurus',
    'Allosaurus','Baryonyx','Velonasaur','Managarmr'
]);

// Underdog categories — non-meta species grouped by combat archetype.
export const UNDERDOG_CATEGORIES: Record<UnderdogCategory & string, { label: string; icon: string; species: string[] }> = {
    heavy: {
        label: 'Heavy Hitters',
        icon: '⚔',
        species: ['Carno','Sarco','Direwolf','Sabertooth','Thylacoleo','Raptor','Terror Bird','Megalania','Mantis','Pachyrhinosaurus','Pachyrhino','Stego','Stegosaurus','Kentro','Kentrosaurus']
    },
    tank: {
        label: 'Tank Surprises',
        icon: '🛡',
        species: ['Diplo','Diplodocus','Bronto','Brontosaurus','Paracer','Paraceratherium','Carbonemys','Doedicurus','Ankylo','Ankylosaurus','Trike','Triceratops','Mammoth','Chalico','Chalicotherium','Gigantopithecus','Dire Bear','Direbear']
    },
    aerial: {
        label: 'Aerial Underdogs',
        icon: '✈',
        species: ['Argent','Argentavis','Pteranodon','Tapejara','Griffin','Snow Owl','Tropeognathus','Phoenix','Wyvern','Lightning Wyvern','Fire Wyvern','Poison Wyvern','Ice Wyvern','Crystal Wyvern']
    },
    aquatic: {
        label: 'Aquatic Warriors',
        icon: '≋',
        species: ['Dunkleosteus','Anglerfish','Electrophorus','Megalodon','Plesiosaur','Plesiosaurus','Diplocaulus','Beelzebufo']
    }
};

export function underdogCategoryFor(species: string): UnderdogCategory {
    const s = (species || '').toLowerCase();
    for (const key of Object.keys(UNDERDOG_CATEGORIES) as Array<keyof typeof UNDERDOG_CATEGORIES>) {
        if (UNDERDOG_CATEGORIES[key].species.some(sp => sp.toLowerCase() === s)) return key;
    }
    return null;
}

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
    // Mutations are stored as TOTAL mutation levels (already includes any per-event scaling).
    // Survivors enter them manually from their UI — no multiplier needed here.
    return getStat(base, key) + getStat(mut, key);
}

export function computeBadges(base: Stats | undefined, mut: Stats | undefined, species?: string): CreatureBadges {
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

    // Boss Ready (total = base + mutation levels, BOTH HP and MEL must meet threshold)
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

    // Underdog (non-meta species only) — HP AND MEL both meet threshold
    let underdog: UnderdogTier = null;
    if (species && !UNDERDOG_META_EXCLUDE.has(species) && underdogCategoryFor(species)) {
        const u = Math.min(tHP, tMEL);
        if (u >= 160) underdog = 'titan';
        else if (u >= 140) underdog = 'legend';
        else if (u >= 115) underdog = 'hero';
        else if (u >= 90)  underdog = 'champion';
    }

    return { bloodline, bossReady, roles, underdog };
}

/** Total badge count for a single creature (across all systems). */
export function badgeCountForCreature(base: Stats | undefined, mut: Stats | undefined, species?: string): number {
    const b = computeBadges(base, mut, species);
    return (b.bloodline ? 1 : 0) + (b.bossReady ? 1 : 0) + b.roles.length + (b.underdog ? 1 : 0);
}

/** Aggregate badge count across a Vault — counts UNIQUE badge x species combinations,
 * since the Badge Wall shows one entry per badge+species earned. */
export function aggregateBadgesByCategory(creatures: Array<{ species: string; baseStats?: Stats; mutations?: Stats }>) {
    const bloodline = new Map<string, BloodlineTier>();
    const bossReady = new Map<string, BossTier>();
    const roles     = new Map<string, Set<RoleBadge>>();
    const underdog  = new Map<string, UnderdogTier>();

    for (const c of creatures) {
        const b = computeBadges(c.baseStats, c.mutations, c.species);
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
        if (b.underdog) {
            const order = { champion: 1, hero: 2, legend: 3, titan: 4 } as const;
            const cur = underdog.get(sp);
            if (!cur || order[b.underdog] > order[cur as keyof typeof order]) underdog.set(sp, b.underdog);
        }
        for (const role of b.roles) {
            if (!roles.has(sp)) roles.set(sp, new Set());
            roles.get(sp)!.add(role);
        }
    }

    return {
        bloodline: Array.from(bloodline.entries()).map(([species, tier]) => ({ species, tier })),
        bossReady: Array.from(bossReady.entries()).map(([species, tier]) => ({ species, tier })),
        underdog:  Array.from(underdog.entries()).map(([species, tier]) => ({ species, tier })),
        roles: Array.from(roles.entries()).flatMap(([species, set]) =>
            Array.from(set).map(role => ({ species, role }))
        )
    };
}

/** Per-creature badge count across a Vault (returns map of creature id-key -> count). */
export function badgeCountByCreature(creatures: Array<{ id: number|string; species?: string; baseStats?: Stats; mutations?: Stats }>) {
    const out = new Map<number|string, number>();
    for (const c of creatures) {
        out.set(c.id, badgeCountForCreature(c.baseStats, c.mutations, c.species));
    }
    return out;
}
