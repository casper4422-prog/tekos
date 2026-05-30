/**
 * Static map-boss data for the Boss Ready badge system.
 *
 * Each surviving badge now requires:
 *   - A specific species (or species list) at a specific tier (typically Alpha Ready)
 *   - Optional minimum total Stamina (base + mutation levels)
 *   - A success-outcome BossRecord for that arena
 *
 * Pruned (May 2026) — keep only the 7 currently-tracked specialist badges.
 *   Removed: Overseer, Center Combo, all Extinction (Titans + King Titan),
 *   all Astraeos, all Lost Colony, Iceworm Queen, and the coming-soon stubs.
 */

export type MapId =
    | 'island' | 'scorched' | 'aberration'
    | 'ragnarok' | 'valguero';

export type BossTier = 'gamma' | 'beta' | 'alpha' | 'titan';

export type MapBoss = {
    id: string;
    map: MapId;
    name: string;
    description: string;
    iconColor: string; // hex
    /** Accepted species (canonical names from species-database.js). Match is case-insensitive exact. */
    requiredSpecies: string[];
    /** Minimum Boss Ready tier the qualifying creature must have reached. Defaults to 'alpha'. */
    requiredTier: BossTier;
    /** Optional extra stat floor: total STA (base + mutation levels). */
    minStamina?: number;
};

export const MAP_NAMES: Record<MapId, string> = {
    island:     'The Island',
    scorched:   'Scorched Earth',
    aberration: 'Aberration',
    ragnarok:   'Ragnarok',
    valguero:   'Valguero'
};

export const MAP_BOSSES: MapBoss[] = [
    // ─── The Island ───
    {
        id: 'broodmother', map: 'island', name: 'Broodmother Specialist',
        description: 'Alpha Ready Megatherium',
        iconColor: '#22c55e',
        requiredSpecies: ['Megatherium'],
        requiredTier:    'alpha'
    },
    {
        id: 'megapithecus', map: 'island', name: 'Megapithecus Specialist',
        description: 'Alpha Ready Rex',
        iconColor: '#8b5cf6',
        requiredSpecies: ['Rex', 'X-Rex'],
        requiredTier:    'alpha'
    },
    {
        id: 'dragon', map: 'island', name: 'Dragon Specialist',
        description: 'Alpha Ready Therizinosaur',
        iconColor: '#ef4444',
        requiredSpecies: ['Therizinosaur'],
        requiredTier:    'alpha'
    },

    // ─── Scorched Earth ───
    {
        id: 'manticore', map: 'scorched', name: 'Manticore Specialist',
        description: 'Alpha Ready Rex or Wyvern · 100+ Stamina',
        iconColor: '#fbbf24',
        requiredSpecies: [
            'Rex','X-Rex',
            'Fire Wyvern','Lightning Wyvern','Poison Wyvern','Ice Wyvern',
            'Crystal Wyvern','Ember Crystal Wyvern','Tropical Crystal Wyvern','Blood Crystal Wyvern'
        ],
        requiredTier:    'alpha',
        minStamina:      100
    },

    // ─── Aberration ───
    {
        id: 'rockwell', map: 'aberration', name: 'Rockwell Slayer',
        description: 'Alpha Ready Rock Drake or Aberrant Megalosaurus',
        iconColor: '#a855f7',
        requiredSpecies: ['Rock Drake', 'Aberrant Megalosaurus'],
        requiredTier:    'alpha'
    },

    // ─── Ragnarok ───
    {
        id: 'nunatak', map: 'ragnarok', name: 'Nunatak Slayer',
        description: 'Alpha Ready Rex or Ice Wyvern · 100+ Stamina',
        iconColor: '#06b6d4',
        requiredSpecies: ['Rex', 'X-Rex', 'Ice Wyvern'],
        requiredTier:    'alpha',
        minStamina:      100
    },

    // ─── Valguero ───
    {
        id: 'grendel', map: 'valguero', name: 'Grendel Slayer',
        description: 'Alpha Ready Deinonychus · 100+ Stamina',
        iconColor: '#ef4444',
        requiredSpecies: ['Deinonychus'],
        requiredTier:    'alpha',
        minStamina:      100
    }
];

export const ULTIMATE_BADGES = [
    { id:'overseer',  map:'island'  as MapId|null, name:'Overseer Challenger',
      description:'Took the Overseer down at Alpha — after all three Island guardians fell first.', iconColor:'#ffd700' },
    { id:'ascension', map:null as MapId|null, name:'Ascension Master',
      description:'Story arc finished. Every released map\'s final boss has your name on it.', iconColor:'#ffd700' },
    { id:'world',     map:null, name:'World Conqueror',
      description:'Every released boss on every map. The roster doesn\'t scare you anymore.', iconColor:'#ffd700' },
    { id:'perfect',   map:null, name:'Perfect Breeder',
      description:'Alpha-tier kills logged on ten different species. You don\'t main one dino, you build the whole lineup.', iconColor:'#ffd700' },
    { id:'frostbite', map:'ragnarok' as MapId|null, name:'Frostbite Champion',
      description:'Nunatak down at Alpha. The ice didn\'t hold.', iconColor:'#00b4ff' },
    { id:'ragnarok',  map:'ragnarok' as MapId|null, name:'Ragnarok Ascended',
      description:'Took Nunatak with cold-vulnerable tames only. Stripped the meta and won anyway.', iconColor:'#ffd700' }
];

export const SPECIAL_ACHIEVEMENTS = [
    { id:'diversity',  name:'Diversity Master',   description:'Boss Ready earned on ten different species. You don\'t play one tame, you play the roster.', target:10 },
    { id:'collection', name:'Perfect Collection', description:'Diamond Bloodline on five species. The whole roster breathes pedigree.', target:5 },
    { id:'underdog',   name:'Underdog Victory',   description:'Took down an Alpha boss with non-meta tames only. The wild remembers.', target:1 },
    { id:'community',  name:'Community Hero',     description:'Helped ten other survivors earn their first Boss Ready badge. The tribe carries the tribe.', target:10 }
];

const TIER_ORDER: Record<BossTier, number> = { gamma: 1, beta: 2, alpha: 3, titan: 4 };

function speciesMatches(creatureSpecies: string, requiredList: string[]): boolean {
    const cs = (creatureSpecies || '').trim().toLowerCase();
    return requiredList.some(r => r.trim().toLowerCase() === cs);
}

/**
 * Computes which map-boss badges a survivor has earned.
 * A badge is earned when:
 *   - A success-outcome BossRecord exists for this arena, AND
 *   - The survivor owns at least one creature of the required species at the
 *     required tier (or higher), meeting the optional stamina floor.
 */
export function computeMapBossBadges(
    bossRecords: Array<{ bossName: string; mapName?: string|null; outcome: string }>,
    creatureStats: Array<{ species: string; bossTier: BossTier | null; staTotal: number }>
): Map<string, { earned: boolean; reason?: string }> {
    const out = new Map<string, { earned: boolean; reason?: string }>();
    const wins = new Set(bossRecords.filter(r => r.outcome === 'success').map(r => r.bossName.toLowerCase()));

    for (const boss of MAP_BOSSES) {
        const won = Array.from(wins).some(w =>
            w.includes(boss.id) || w.includes(boss.name.toLowerCase().split(' ')[0])
        );
        const requiredOrder = TIER_ORDER[boss.requiredTier];
        const hasQualifier = creatureStats.some(c => {
            if (!c.bossTier) return false;
            if (TIER_ORDER[c.bossTier] < requiredOrder) return false;
            if (!speciesMatches(c.species, boss.requiredSpecies)) return false;
            if (boss.minStamina != null && c.staTotal < boss.minStamina) return false;
            return true;
        });
        out.set(boss.id, { earned: won && hasQualifier });
    }
    return out;
}
