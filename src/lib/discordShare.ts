import { getStat, type Stats } from '$lib/badges';

export type ShareableCreature = {
	name: string;
	species: string;
	gender: string;
	baseStats: Stats;
	mutations: Stats;
	availableForBreeding?: boolean;
	availableForTrade?: boolean;
};

// Six core stats render as a 3×2 grid for every species. Crafting renders
// on a 4th line below the grid ONLY for species where the stat mechanically
// matters — currently just Gacha (its Crafting Skill drives resource output
// quality). Speed isn't shown because it doesn't level on tames in ASA.
const CORE_STATS = ['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL'] as const;
const STAT_EMOJI: Record<string, string> = {
	HP:   '❤️',
	STA:  '⚡',
	OXY:  '💧',
	FOOD: '🍖',
	WGT:  '⚖️',
	MEL:  '⚔️',
	CRA:  '🔨'
};

const CRAFTING_SPECIES = new Set(['gacha']);

function genderGlyph(g: string): string {
	const l = (g || '').toLowerCase();
	if (l === 'male') return '♂';
	if (l === 'female') return '♀';
	return '';
}

/**
 * Format a creature into a Discord-pasteable summary:
 *
 *   🦕 REX — "Big Daddy" ♂
 *   ━━━━━━━━━━━━━━━━━━━
 *   ❤️ HP 52 · ⚡ STA 38
 *   💧 OXY 30 · 🍖 FOOD 44
 *   ⚖️ WGT 41 · ⚔️ MEL 48
 *   ━━━━━━━━━━━━━━━━━━━
 *   ✅ Available for Breeding | Trade
 *
 * Crafting (🔨 CRA) renders on its own line under the grid for Gacha only.
 * Availability line omitted when neither flag is set.
 */
export function formatCreatureForDiscord(c: ShareableCreature): string {
	const species = (c.species || 'CREATURE').toUpperCase();
	const name = c.name || 'Unnamed';
	const glyph = genderGlyph(c.gender);
	const header = `🦕 ${species} — "${name}"${glyph ? ' ' + glyph : ''}`;

	// 3 rows × 2 cols over the 6 core stats.
	const statRows: string[] = [];
	for (let i = 0; i < CORE_STATS.length; i += 2) {
		const left  = CORE_STATS[i];
		const right = CORE_STATS[i + 1];
		const lVal  = getStat(c.baseStats, left)  + getStat(c.mutations, left);
		const rVal  = getStat(c.baseStats, right) + getStat(c.mutations, right);
		statRows.push(`${STAT_EMOJI[left]} ${left} ${lVal} · ${STAT_EMOJI[right]} ${right} ${rVal}`);
	}

	// Crafting tag on its own row when the species cares about it.
	if (CRAFTING_SPECIES.has((c.species || '').toLowerCase())) {
		const craftVal = getStat(c.baseStats, 'CRA') + getStat(c.mutations, 'CRA');
		statRows.push(`${STAT_EMOJI.CRA} CRA ${craftVal}`);
	}

	const availability: string[] = [];
	if (c.availableForBreeding) availability.push('Breeding');
	if (c.availableForTrade) availability.push('Trade');
	const availLine = availability.length > 0
		? `✅ Available for ${availability.join(' | ')}`
		: '';

	const divider = '━━━━━━━━━━━━━━━━━━━';

	const lines = [header, divider, ...statRows, divider];
	if (availLine) lines.push(availLine);

	return lines.join('\n');
}

/** Async clipboard copy of the formatted block. Returns true on success. */
export async function shareCreatureToDiscord(c: ShareableCreature): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(formatCreatureForDiscord(c));
		return true;
	} catch {
		return false;
	}
}

/** Copy the creature's public detail URL to clipboard. */
export async function copyCreatureLink(creatureId: number): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(`${window.location.origin}/specimens/${creatureId}`);
		return true;
	} catch {
		return false;
	}
}
