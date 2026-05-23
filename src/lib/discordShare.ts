import { computeBadges, getStat, type Stats } from '$lib/badges';

export type ShareableCreature = {
	name: string;
	species: string;
	gender: string;
	baseStats: Stats;
	mutations: Stats;
	availableForBreeding?: boolean;
	availableForTrade?: boolean;
};

const STAT_KEYS = ['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA'] as const;

function genderGlyph(g: string): string {
	const l = (g || '').toLowerCase();
	if (l === 'male') return '♂';
	if (l === 'female') return '♀';
	return '';
}

function bossReadyTierLabel(t: 'gamma' | 'beta' | 'alpha' | 'titan' | null): string {
	if (!t) return '';
	return t.charAt(0).toUpperCase() + t.slice(1);
}

function totalMutations(mut: Stats): number {
	// Mutation field stores TOTAL mutation LEVELS across the 7 stats.
	// Sum them — no ×2 multiplier (matches the current creature-card math).
	return STAT_KEYS.reduce((sum, k) => sum + getStat(mut, k), 0);
}

/**
 * Format a creature into a Discord-pasteable summary matching the spec block:
 *
 *   🦕 REX — "Big Daddy" ♂
 *   ━━━━━━━━━━━━━━━━━━━━━
 *   🔵 Boss Ready: Alpha · 🧬 18 Mutations
 *   📊 HP: 52 · STA: 38 · OXY: 30 · FOOD: 44 · WGT: 41 · MEL: 48 · CRA: 0
 *   ━━━━━━━━━━━━━━━━━━━━━
 *   ✅ Available for Breeding | Trade
 *
 * The third (status) line is omitted entirely if neither availability flag is true.
 */
export function formatCreatureForDiscord(c: ShareableCreature): string {
	const species = (c.species || 'CREATURE').toUpperCase();
	const name = c.name || 'Unnamed';
	const glyph = genderGlyph(c.gender);
	const header = `🦕 ${species} — "${name}"${glyph ? ' ' + glyph : ''}`;

	const badges = computeBadges(c.baseStats, c.mutations, c.species);
	const mutCount = totalMutations(c.mutations);
	const metaParts: string[] = [];
	if (badges.bossReady) metaParts.push(`🔵 Boss Ready: ${bossReadyTierLabel(badges.bossReady)}`);
	if (badges.bloodline) metaParts.push(`💎 ${badges.bloodline.charAt(0).toUpperCase() + badges.bloodline.slice(1)} Bloodline`);
	metaParts.push(`🧬 ${mutCount} Mutation${mutCount === 1 ? '' : 's'}`);
	const metaLine = metaParts.join(' · ');

	const statsLine = '📊 ' + STAT_KEYS
		.map(k => `${k}: ${getStat(c.baseStats, k) + getStat(c.mutations, k)}`)
		.join(' · ');

	const availability: string[] = [];
	if (c.availableForBreeding) availability.push('Breeding');
	if (c.availableForTrade) availability.push('Trade');
	const availLine = availability.length > 0
		? `✅ Available for ${availability.join(' | ')}`
		: '';

	const divider = '━━━━━━━━━━━━━━━━━━━━━';

	const lines = [
		header,
		divider,
		metaLine,
		statsLine,
		divider
	];
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
