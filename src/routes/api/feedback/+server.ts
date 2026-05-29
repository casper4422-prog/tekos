/**
 * POST /api/feedback
 *
 * In-app feedback submission. Fires a Discord webhook with the report so
 * the maintainer gets a real-time ping with all the context inline.
 *
 * The webhook URL lives in env var DISCORD_FEEDBACK_WEBHOOK_URL. If it's
 * not set, the endpoint returns 503 — the modal surfaces that as a "send
 * failed, try again later" message. Better than silently dropping reports.
 *
 * Guests are blocked (the layout doesn't render the trigger for them
 * either; this is a defense-in-depth check in case the modal gets
 * exposed elsewhere).
 *
 * Body shape:
 *   { severity: 'bug'|'feature'|'question'|'other',
 *     title: string,           // ≤ 120 chars
 *     description: string,     // ≤ 2000 chars
 *     pageUrl: string,         // path the user was on
 *     userAgent: string }      // navigator.userAgent, parsed minimally server-side
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

type Severity = 'bug' | 'feature' | 'question' | 'other';

const SEVERITY_COLOR: Record<Severity, number> = {
    bug:      0xef4444,  // red
    feature:  0x00b4ff,  // cyan
    question: 0xfbbf24,  // amber
    other:    0x94a3b8   // slate
};
const SEVERITY_LABEL: Record<Severity, string> = {
    bug:      '🐛 Bug',
    feature:  '✨ Feature',
    question: '❓ Question',
    other:    '◆ Other'
};

function parseUA(ua: string): string {
    // Best-effort one-line "Chrome 130 / Win10" summary. Falls back to
    // a slice of the raw string if nothing recognizable lands.
    if (!ua) return 'unknown';
    let browser = 'Browser';
    let os = 'OS';
    const m = ua.match(/(Edg|Chrome|Firefox|Safari)\/([\d.]+)/);
    if (m) {
        const name = m[1] === 'Edg' ? 'Edge' : m[1];
        // Strip Chrome's "(KHTML, like Gecko)" noise by truncating version
        browser = `${name} ${m[2].split('.')[0]}`;
    }
    if (ua.includes('Windows NT 10')) os = 'Win10/11';
    else if (ua.includes('Windows NT')) os = 'Windows';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('iPhone')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';
    return `${browser} · ${os}`;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) return json({ error: 'Sign in to send feedback' }, { status: 401 });

    const webhookUrl = env.DISCORD_FEEDBACK_WEBHOOK_URL;
    if (!webhookUrl) {
        // Logged here so deploy issues are visible in Render logs; client
        // sees the generic 503 message.
        console.error('DISCORD_FEEDBACK_WEBHOOK_URL is not set — feedback not delivered');
        return json({ error: 'Feedback channel unavailable. Please try again later.' }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        throw error(400, 'Invalid JSON body');
    }
    const raw = body as Record<string, unknown>;

    const severityRaw = String(raw.severity ?? '').toLowerCase();
    const severity: Severity = (['bug','feature','question','other'].includes(severityRaw)
        ? severityRaw
        : 'other') as Severity;

    const title = String(raw.title ?? '').trim().slice(0, 120);
    const description = String(raw.description ?? '').trim().slice(0, 2000);
    if (!title || !description) {
        throw error(400, 'Title and description are required');
    }

    const pageUrl  = String(raw.pageUrl ?? '').trim().slice(0, 200) || '(unknown)';
    const userAgent = String(raw.userAgent ?? '').trim().slice(0, 400);
    const ua = parseUA(userAgent);

    const u = locals.user;
    const fromName = u.nickname ?? u.email ?? `User #${u.id}`;

    // Build the Discord embed. Discord supports max 4096 chars in
    // description; we cap at 2000 client-side anyway so this is safe.
    const payload = {
        username: 'TekOS Feedback',
        embeds: [
            {
                title: `${SEVERITY_LABEL[severity]} — ${title}`,
                description,
                color: SEVERITY_COLOR[severity],
                fields: [
                    { name: 'From', value: `${fromName} (id #${u.id})`, inline: true },
                    { name: 'Page', value: `\`${pageUrl}\``, inline: true },
                    { name: 'Browser', value: ua, inline: false }
                ],
                timestamp: new Date().toISOString()
            }
        ]
    };

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            // Surface Discord's error in server logs for debugging
            const txt = await res.text().catch(() => '');
            console.error(`Discord webhook returned ${res.status}: ${txt}`);
            return json({ error: 'Feedback delivery failed. Please try again later.' }, { status: 502 });
        }
    } catch (err) {
        console.error('Discord webhook fetch failed:', err);
        return json({ error: 'Feedback delivery failed. Please try again later.' }, { status: 502 });
    }

    return json({ ok: true });
};
