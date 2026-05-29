/**
 * Static map-boss data for the Boss Ready badge system.
 * Verified against ark.wiki.gg for ASA (May 2026).
 *
 * Each boss carries:
 *   - The map it belongs to
 *   - The tier requirement (gamma/beta/alpha/titan/tame/world) — earned at that tier or higher
 *   - A short specialty hint shown in the badge requirement line
 *
 * 'tame' = field-tame titan (Forest / Ice / Desert)
 * 'world' = roaming/dungeon boss with no tier ladder (Thanatos, Iceworm Queen)
 */

export type MapId =
    | 'island' | 'scorched' | 'center' | 'aberration' | 'extinction'
    | 'astraeos' | 'ragnarok' | 'valguero' | 'lost_colony'
    | 'genesis' | 'lost_island' | 'crystal' | 'fjordur';

export type BossTier = 'gamma' | 'beta' | 'alpha' | 'titan' | 'tame' | 'world';

export type MapBoss = {
    id: string;
    map: MapId;
    name: string;
    tier: BossTier;
    specialty: string;
    description: string;
    iconColor: string; // hex
    comingSoon?: boolean;
};

export const MAP_NAMES: Record<MapId, string> = {
    island:      'The Island',
    scorched:    'Scorched Earth',
    center:      'The Center',
    aberration:  'Aberration',
    extinction:  'Extinction',
    astraeos:    'Astraeos',
    ragnarok:    'Ragnarok',
    valguero:    'Valguero',
    lost_colony: 'Lost Colony',
    genesis:     'Genesis',
    lost_island: 'Lost Island',
    crystal:     'Crystal Isles',
    fjordur:     'Fjordur'
};

export const MAP_BOSSES: MapBoss[] = [
    // ─── The Island ───
    { id:'broodmother',  map:'island', name:'Broodmother Specialist',  tier:'alpha',
      specialty:'Megatherium bonus', description:'Alpha Ready + Megatherium bonus', iconColor:'#22c55e' },
    { id:'megapithecus', map:'island', name:'Megapithecus Specialist', tier:'alpha',
      specialty:'High DPS', description:'Alpha Ready + High DPS',                 iconColor:'#8b5cf6' },
    { id:'dragon',       map:'island', name:'Dragon Specialist',       tier:'alpha',
      specialty:'Fire-resistant META', description:'Alpha Ready + Fire-resistant comp', iconColor:'#ef4444' },
    { id:'overseer',     map:'island', name:'Overseer Slayer',         tier:'alpha',
      specialty:'Tek Cave traversal', description:'Defeat Overseer after all three guardians', iconColor:'#94a3b8' },

    // ─── Scorched Earth ───
    { id:'manticore', map:'scorched', name:'Manticore Specialist', tier:'alpha',
      specialty:'Stamina ≥ 100', description:'Alpha Ready + Stamina ≥ 100', iconColor:'#fbbf24' },

    // ─── The Center (combined arena) ───
    { id:'center_combo', map:'center', name:'Floating Island Champion', tier:'alpha',
      specialty:'25-min combined arena', description:'Alpha Ready + clear Broodmother & Megapithecus combo', iconColor:'#8b5cf6' },

    // ─── Aberration ───
    { id:'rockwell', map:'aberration', name:'Rockwell Slayer', tier:'alpha',
      specialty:'Radiation resistance', description:'Alpha Ready + Radiation resistance', iconColor:'#a855f7' },

    // ─── Extinction ───
    { id:'forest_titan', map:'extinction', name:'Forest Titan Tamer', tier:'tame',
      specialty:'Element shards', description:'Field-tame Forest Titan via corruption nodes', iconColor:'#22c55e' },
    { id:'ice_titan',    map:'extinction', name:'Ice Titan Tamer',    tier:'tame',
      specialty:'Cold resistance', description:'Field-tame Ice Titan in the Snow Dome',     iconColor:'#06b6d4' },
    { id:'desert_titan', map:'extinction', name:'Desert Titan Tamer', tier:'tame',
      specialty:'Aerial superiority', description:'Field-tame Desert Titan (flying platform)', iconColor:'#fbbf24' },
    { id:'king_titan',   map:'extinction', name:'King Titan Slayer',  tier:'titan',
      specialty:'All field Titans required', description:'Defeat King Titan after taming the 3 field Titans', iconColor:'#ef4444' },

    // ─── Astraeos (Feb 2025) ───
    { id:'hydraskos', map:'astraeos', name:'Hydraskos Specialist',     tier:'alpha',
      specialty:'Behind-attack META', description:'Alpha Ready + flank discipline', iconColor:'#d946ef' },
    { id:'natrix',    map:'astraeos', name:'Natrix Specialist',        tier:'alpha',
      specialty:'Disease resistance', description:'Alpha Ready + cure stack',       iconColor:'#22c55e' },
    { id:'thodes',    map:'astraeos', name:'Thodes Specialist',        tier:'alpha',
      specialty:'Eye-window DPS', description:'Alpha Ready + burst windows',         iconColor:'#fbbf24' },
    { id:'thanatos',  map:'astraeos', name:'Thanatos Hunter',          tier:'world',
      specialty:'World boss kill', description:'Defeat Thanatos in Therokis',        iconColor:'#ef4444' },

    // ─── Ragnarok (Jun 2025) ───
    { id:'nunatak',         map:'ragnarok', name:'Nunatak Slayer',     tier:'alpha',
      specialty:'Cold resistance', description:'Alpha Ready + Cold resistance',     iconColor:'#06b6d4' },
    { id:'iceworm_queen',   map:'ragnarok', name:'Iceworm Queen',      tier:'world',
      specialty:'Frozen Dungeon clear', description:'Clear the Frozen Dungeon beneath Blizzard Peak', iconColor:'#67e8f9' },

    // ─── Valguero (Oct 2025) ───
    { id:'grendel', map:'valguero', name:'Grendel Slayer', tier:'alpha',
      specialty:'Bleed-resistance', description:'Alpha Ready + bleed mitigation',   iconColor:'#ef4444' },

    // ─── Lost Colony (Dec 2025) — chained ───
    { id:'lost_king',  map:'lost_colony', name:'Lost King Slayer',  tier:'alpha',
      specialty:'Power-pole rotation', description:'Alpha Ready + multi-phase coordination', iconColor:'#ef4444' },
    { id:'lost_queen', map:'lost_colony', name:'Lost Queen Slayer', tier:'alpha',
      specialty:'Tether-break duty', description:'Alpha Ready + tether-control role', iconColor:'#d946ef' },

    // ─── Coming soon ───
    { id:'soon_genesis1',    map:'genesis',     name:'Master Controller (TBD)', tier:'alpha',
      specialty:'Genesis Pt 1 (Jun 2026)', description:'Coming with Genesis Part 1 Ascended',
      iconColor:'#64748b', comingSoon:true },
    { id:'soon_lost_island', map:'lost_island', name:'Dinopithecus King (TBD)', tier:'alpha',
      specialty:'Lost Island port pending', description:'Coming when Lost Island ports to ASA',
      iconColor:'#64748b', comingSoon:true },
    { id:'soon_crystal',     map:'crystal',     name:'Crystal Wyvern Queen (TBD)', tier:'alpha',
      specialty:'Crystal Isles port pending', description:'Coming when Crystal Isles ports to ASA',
      iconColor:'#64748b', comingSoon:true },
    { id:'soon_fjordur',     map:'fjordur',     name:'Fenrisúlfr (TBD)', tier:'alpha',
      specialty:'Fjordur port deprioritized', description:'Coming when Fjordur ports to ASA',
      iconColor:'#64748b', comingSoon:true }
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
    { id:'speedrun',   name:'Speedrun Champion',  description:'Cleared an Alpha boss within thirty days of awakening. Welcome to the deep end.', target:1 },
    { id:'collection', name:'Perfect Collection', description:'Diamond Bloodline on five species. The whole roster breathes pedigree.', target:5 },
    { id:'underdog',   name:'Underdog Victory',   description:'Took down an Alpha boss with non-meta tames only. The wild remembers.', target:1 },
    { id:'community',  name:'Community Hero',     description:'Helped ten other survivors earn their first Boss Ready badge. The tribe carries the tribe.', target:10 }
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
        if (boss.comingSoon || boss.tier === 'tame' || boss.tier === 'world') {
            // Field tames + world bosses + unreleased — earned by completion alone, no tier gate.
            const won = Array.from(wins).some(w => w.includes(boss.id) || w.includes(boss.name.toLowerCase().split(' ')[0]));
            out.set(boss.id, { earned: won });
            continue;
        }
        const won = Array.from(wins).some(w => w.includes(boss.id) || w.includes(boss.name.toLowerCase().split(' ')[0]));
        const required = tierOrder[boss.tier as 'gamma'|'beta'|'alpha'|'titan'];
        const anyAtTier = Array.from(highestBossTierBySpecies.values()).some(t => tierOrder[t] >= required);
        out.set(boss.id, { earned: won && anyAtTier });
    }
    return out;
}
