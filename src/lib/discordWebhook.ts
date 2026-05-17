import { db } from '$lib/db';

type WebhookOpts = {
	username?: string;
	avatarUrl?: string;
};

/**
 * Post a plain-text message to a user's saved Discord webhook URL.
 * Looks up settings.integrations.discordWebhook on the recipient.
 * No-ops silently if the webhook is missing, malformed, or rejected — we never
 * want a Discord delivery problem to block our own API responses.
 *
 * Today we honor the user's per-event opt-ins under
 * settings.integrations.discordEvents = { tribeAnnounce?, warRoom?, badge?, trade? }.
 * Default for each event is true if the webhook is set, false otherwise.
 */
export async function postToUserDiscord(
	userId: number,
	eventKind: 'tribeAnnounce' | 'warRoom' | 'badge' | 'trade',
	content: string,
	opts: WebhookOpts = {}
): Promise<boolean> {
	try {
		const user = await db.user.findUnique({ where: { id: userId }, select: { settings: true } });
		const settings = (user?.settings as Record<string, unknown> | null) ?? {};
		const integrations = (settings.integrations as Record<string, unknown> | undefined) ?? {};
		const webhook = typeof integrations.discordWebhook === 'string' ? integrations.discordWebhook.trim() : '';
		if (!webhook || !webhook.startsWith('https://')) return false;

		const events = (integrations.discordEvents as Record<string, boolean> | undefined) ?? {};
		// If the user has explicitly opted out, skip; otherwise default on.
		if (events[eventKind] === false) return false;

		const body: Record<string, unknown> = { content: content.slice(0, 2000) };
		if (opts.username)  body.username  = opts.username.slice(0, 80);
		if (opts.avatarUrl) body.avatar_url = opts.avatarUrl;

		const res = await fetch(webhook, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		return res.ok;
	} catch {
		return false;
	}
}
