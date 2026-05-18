import { db } from '$lib/db';

// Map notify() event types to the user-facing notification category they belong to.
// Categories match the rows in Settings → Notifications. If an event type isn't
// listed here, the in-app notification is always created (fail-open).
const TYPE_TO_CATEGORY: Record<string, string> = {
	// Network / friends
	friend_request:   'friendRequests',
	friend_accepted:  'friendRequests',
	// Tribe
	tribe_invite:                 'tribeActivity',
	tribe_join_request:           'tribeActivity',
	tribe_accepted:               'tribeActivity',
	tribe_rejected:               'tribeActivity',
	tribe_kicked:                 'tribeActivity',
	tribe_announcement:           'tribeActivity',
	tribe_ownership_transferred:  'tribeActivity',
	alliance_request:             'tribeActivity',
	alliance_accepted:            'tribeActivity',
	war_room_invite:              'bossTimers',
	// Marketplace
	trade_offer:      'tradeRequests',
	offer_message:    'tradeRequests',
	offer_counter:    'tradeRequests',
	offer_accepted:   'tradeRequests',
	offer_rejected:   'tradeRequests'
	// Other event types fall through and notify unconditionally
};

function withinQuietHours(now: Date, startHM: string, endHM: string): boolean {
	const parse = (s: string) => {
		const [h, m] = s.split(':').map(n => parseInt(n, 10));
		if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
		return h * 60 + m;
	};
	const start = parse(startHM);
	const end = parse(endHM);
	if (start == null || end == null) return false;
	const nowMin = now.getHours() * 60 + now.getMinutes();
	// Window can wrap past midnight (e.g. 23:00 → 07:00).
	return start <= end ? (nowMin >= start && nowMin < end)
	                    : (nowMin >= start || nowMin < end);
}

/**
 * Create a notification for a user. Respects their notification preferences:
 *   - skipped if the matching category's in-app channel is off
 *   - skipped if the recipient is within their configured quiet hours
 * Falls open (always creates) on any pref-read failure or unmapped event type.
 */
export async function notify(userId: number, actorUserId: number, type: string, payload: Record<string, unknown> = {}) {
	if (userId === actorUserId) return; // never notify yourself

	try {
		const recipient = await db.user.findUnique({
			where: { id: userId },
			select: { settings: true }
		});
		const settings = (recipient?.settings as Record<string, unknown> | null) ?? {};
		const notifs = (settings.notifications as Record<string, unknown> | undefined) ?? {};

		const category = TYPE_TO_CATEGORY[type];
		if (category) {
			const row = (notifs[category] as Record<string, unknown> | undefined) ?? {};
			if (row.inapp === false) return; // user opted out of this category
		}

		if (notifs.quietHoursOn === true && typeof notifs.quietStart === 'string' && typeof notifs.quietEnd === 'string') {
			if (withinQuietHours(new Date(), notifs.quietStart, notifs.quietEnd)) return;
		}
	} catch { /* fall open on any pref read failure */ }

	await db.notification.create({ data: { userId, actorUserId, type, payload } }).catch((err) => {
		console.error('[notify] create failed', { userId, type, err });
	});
}
