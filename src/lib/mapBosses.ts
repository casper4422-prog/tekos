/**
 * Static map-boss data for the Boss Ready badge system.
 * Sourced from achievements_system.md + badges-preview.html.
 *
 * Each boss carries:
 *   - The map it belongs to
 *   - The tier requirement (gamma/beta/alpha/titan) — earned at that tier or higher
 *   - A short specialty hint shown in the badge requirement line
 */

export type MapId =
    | 'island' | 'scorched' | 'aberration' | 'extinction' | 'genesis'
    | 'ragnarok' | 'crystal' | 'lost' | 'valguero' | 'fjordur' | 'astraeos';

export type MapBoss = {
    id: string;
    map: MapId;
    name: string;
    tier: 'gamma' | 'beta' | 'alpha' | 'titan';
    specialty: string;
    description: string;
    iconColor: string; // hex pair, lighter -> darker
};

export const MAP_NAMES: Record<MapId, string> = {
    island:     'The Island',
    scorched:   'Scorched Earth',
    aberration: 'Aberration',
    extinction: 'Extinction',
    genesis:    'Genesis',
    ragnarok:   'Ragnarok (ASA)',
    crystal:    'Crystal Isles',
    lost:       'Lost Island',
    valguero:   'Valguero',
    fjordur:    'Fjordur',
    astraeos:   'Astraeos'
};

export const MAP_BOSSES: MapBoss[] = [
    // ─── The Island ───
    { id:'broodmother',  map:'island',     name:'Broodmother Specialist',  tier:'alpha',  specialty:'Megatherium bonus',
      description:'Alpha Ready + Megatherium bonus', iconColor:'#fbbf24' },
    { id:'megapithecus', map:'island',     name:'Megapithecus Specialist', tier:'alpha',  specialty:'High DPS',
      description:'Alpha Ready + High DPS',          iconColor:'#fbbf24' },
    { id:'dragon',       map:'island',     name:'Dragon Specialist',       tier:'alpha',  specialty:'Herbivore advantage',
      description:'Alpha Ready + Herbivore advantage', iconColor:'#fbbf24' },
    // ─── Scorched Earth ───
    { id:'manticore',    map:'scorched',   name:'Manticore Specialist',    tier:'alpha',  specialty:'Stamina ≥ 100',
      description:'Alpha Ready + Stamina ≥ 100',      iconColor:'#fbbf24' },
    // ─── Aberration ───
    { id:'rockwell',     map:'aberration', name:'Rockwell Slayer',         tier:'alpha',  specialty:'Radiation resistance',
      description:'Alpha Ready + Radiation resistance', iconColor:'#a855f7' },
    // ─── Extinction ───
    { id:'desert',       map:'extinction', name:'Desert Titan Tamer',      tier:'titan',  specialty:'Aerial superiority',
      description:'Titan Ready + Aerial superiority', iconColor:'#fbbf24' },
    { id:'forest',       map:'extinction', name:'Forest Titan Tamer',      tier:'titan',  specialty:'Element shards',
      description:'Titan Ready + Element shards',     iconColor:'#22c55e' },
    { id:'ice',          map:'extinction', name:'Ice Titan Tamer',         tier:'titan',  specialty:'Cold resistance',
      description:'Titan Ready + Cold resistance',    iconColor:'#60a5fa' },
    { id:'king',         map:'extinction', name:'King Titan Slayer',       tier:'titan',  specialty:'Endgame, all titans',
      description:'Defeat King Titan after 3 titans', iconColor:'#ef4444' },
    // ─── Genesis ───
    { id:'corrupted',    map:'genesis',    name:'Corrupted Master',        tier:'alpha',  specialty:'Element corruption',
      description:'Alpha Ready + Element corruption', iconColor:'#a855f7' },
    // ─── Ragnarok (ASA) ───
    { id:'nunatak',      map:'ragnarok',   name:'Nunatak Slayer',          tier:'alpha',  specialty:'Cold resistance',
      description:'Alpha Ready + Cold resistance',    iconColor:'#60a5fa' },
];

export const ULTIMATE_BADGES = [
    { id:'overseer',     map:'island',     name:'Overseer Challenger',     description:'Titan Slayer + All Island bosses defeated', iconColor:'#ffd700' },
    { id:'ascension',    map:null as MapId|null, name:'Ascension Master',  description:'All story map bosses cleared (Island, Scorched, Aberration, Extinction, Genesis)', iconColor:'#ffd700' },
    { id:'world',        map:null,         name:'World Conqueror',         description:'All map bosses across every map cleared', iconColor:'#ffd700' },
    { id:'perfect',      map:null,         name:'Perfect Breeder',         description:'Titan Slayer tier on 10+ different species', iconColor:'#ffd700' },
    { id:'frostbite',    map:'ragnarok',   name:'Frostbite Champion',      description:'Titan Slayer for Nunatak', iconColor:'#00b4ff' },
    { id:'ragnarok',     map:'ragnarok',   name:'Ragnarok Ascended',       description:'Defeat Nunatak with non-cold-resistant creatures', iconColor:'#ffd700' }
];

export const SPECIAL_ACHIEVEMENTS = [
    { id:'diversity',    name:'Diversity Master',  description:'Earn Boss Ready badges across 10+ different species', target:10 },
    { id:'speedrun',     name:'Speedrun Champion', description:'Clear any map\'s Alpha boss within 30 days of account creation', target:1 },
    { id:'collection',   name:'Perfect Collection',description:'Diamond Bloodline on 5+ species', target:5 },
    { id:'underdog',     name:'Underdog Victory',  description:'Defeat any Alpha boss using only Underdog-eligible species', target:1 },
    { id:'community',    name:'Community Hero',    description:'Help 10+ other Survivors earn their first Boss Ready badge', target:10 }
];

/** Computes which map-boss badges a survivor has earned, based on their BossRecord wins
 *  and their highest Boss Ready tier on the relevant species. */
export function computeMapBossBadges(
    bossRecords: Array<{ bossName: string; mapName?: string|null; outcome: string }>,
    highestBossTierBySpecies: Map<string, 'gamma'|'beta'|'alpha'|'titan'>
): Map<string, { earned: boolean; reason?: string }> {
    const out = new Map<string, { earned: boolean; reason?: string }>();
    const tierOrder = { gamma: 1, beta: 2, alpha: 3, titan: 4 } as const;
    const wins = new Set(bossRecords.filter(r => r.outcome === 'success').map(r => r.bossName.toLowerCase()));

    for (const boss of MAP_BOSSES) {
        const won = Array.from(wins).some(w => w.includes(boss.id) || w.includes(boss.name.toLowerCase().split(' ')[0]));
        const required = tierOrder[boss.tier];
        const anyAtTier = Array.from(highestBossTierBySpecies.values()).some(t => tierOrder[t] >= required);
        out.set(boss.id, { earned: won && anyAtTier });
    }
    return out;
}
