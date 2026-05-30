/**
 * Shared countdown helper for war-room scheduledAt timestamps.
 * Used by:
 *   - /overseer roster (active-session card)
 *   - /overseer/[id] header
 *   - /tribe Next War Room card
 *   - /notifications boss countdown
 *
 * Render pattern: callers ticker their own `now` state (setInterval) and pipe
 * (now, scheduledAt) through formatCountdown. urgent=true gates the red-glow style.
 */

export type Countdown = { text: string; urgent: boolean; past: boolean };

export function formatCountdown(now: number, scheduledAt: Date | string | null | undefined): Countdown {
    if (!scheduledAt) return { text: '—', urgent: false, past: false };
    const t = scheduledAt instanceof Date ? scheduledAt.getTime() : new Date(scheduledAt).getTime();
    const remaining = t - now;
    if (remaining <= 0) return { text: 'LIVE', urgent: true, past: true };

    let diff = remaining;
    const d = Math.floor(diff / 86_400_000); diff -= d * 86_400_000;
    const h = Math.floor(diff / 3_600_000);  diff -= h * 3_600_000;
    const m = Math.floor(diff / 60_000);     diff -= m * 60_000;
    const s = Math.floor(diff / 1000);

    let text: string;
    if (d > 0)      text = `${d}d ${h}h`;
    else if (h > 0) text = `${h}h ${m}m`;
    else            text = `${m}m ${s.toString().padStart(2,'0')}s`;

    const urgent = remaining < 3_600_000; // last hour
    return { text, urgent, past: false };
}
