// Curated starter sources surfaced on the Feed page when a user has no
// saved sources yet. Each is one-click subscribable + we have a bulk
// "Subscribe to all" action. See [[tekos-starter-source-list]] memory for
// the rationale — Wildcard official + r/ARKSurvivalAscended + Loaded Crysis
// as the cornerstone YouTuber. Edit this list to update the defaults.

export type RecommendedSource = {
	type: 'youtube' | 'twitter' | 'reddit' | 'twitch' | 'steam';
	url: string;
	label: string;
	description: string;
};

export const RECOMMENDED_SOURCES: RecommendedSource[] = [
	{
		type: 'youtube',
		url: 'https://youtube.com/@StudioWildcard',
		label: 'Studio Wildcard',
		description: 'Official ASA trailers, hotfix breakdowns, dev streams'
	},
	{
		type: 'twitter',
		url: 'https://twitter.com/StudioWildcard',
		label: '@StudioWildcard',
		description: 'Patch notes + community Q&A land here first'
	},
	{
		type: 'steam',
		url: 'https://store.steampowered.com/app/2399830',
		label: 'ARK Ascended (Steam)',
		description: 'Official Steam announcements for the game'
	},
	{
		type: 'reddit',
		url: 'https://reddit.com/r/ARKSurvivalAscended',
		label: 'r/ARKSurvivalAscended',
		description: 'Main ASA subreddit — community discussion + memes'
	},
	{
		type: 'youtube',
		url: 'https://youtube.com/@LoadedCrysis',
		label: 'Loaded Crysis',
		description: 'Featured ASA Creator · Cluster Owner, Pretty Chill Guy'
	}
];
