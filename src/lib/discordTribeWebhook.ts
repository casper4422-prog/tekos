import { db } from '$lib/db';

/**
 * Per-tribe Discord webhook sink.
 *
 * Each tribe owner can configure a single Discord webhook URL via the Edit
 * Tribe Identity modal. War-room lifecycle events fire embeds to that URL
 * if it's set. Failures are swallowed — Discord being down should NEVER
 * fail the user's in-app action.
 */

const WEBHOOK_RE = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

export function isValidDiscordWebhookUrl(url: string): boolean {
    if (!url) return false;
    return WEBHOOK_RE.test(url.trim());
}

export type DiscordEmbed = {
    title?: string;
    description?: string;
    color?: number;        // decimal RGB e.g. 0x00b4ff
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: { text: string };
    timestamp?: string;    // ISO
    url?: string;
};

/**
 * Post an embed to the configured webhook for `tribeId`.
 * Returns true on 2xx, false otherwise (or if the tribe has no webhook configured).
 * Never throws — errors are logged and swallowed.
 */
export async function postToTribeChannel(tribeId: number, embed: DiscordEmbed): Promise<boolean> {
    try {
        const tribe = await db.tribe.findUnique({
            where: { id: tribeId },
            select: { discordWebhookUrl: true }
        });
        const url = tribe?.discordWebhookUrl?.trim();
        if (!url || !isValidDiscordWebhookUrl(url)) return false;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });
        return res.ok;
    } catch (e) {
        console.warn('[discord:tribe] webhook delivery failed', e);
        return false;
    }
}

/* Convenience builders matching ARK's TekOS palette so embeds stay on-brand. */

export const COLOR_INFO    = 0x00b4ff;
export const COLOR_SUCCESS = 0x22c55e;
export const COLOR_WARN    = 0xfbbf24;
export const COLOR_DANGER  = 0xef4444;
