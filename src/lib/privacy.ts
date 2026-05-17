import { db } from '$lib/db';

/**
 * Helpers that decide whether a viewer is allowed to do something with a target
 * survivor, based on the target's settings.privacy preferences plus the
 * relationship (friend, tribemate) between them.
 *
 * All defaults are permissive — if a user has no preferences set, anyone can
 * see their profile, vault, send DMs, etc.
 */

type PrivacySettings = {
	profileVisibility?: 'public' | 'survivors' | 'tribe_friends' | 'friends' | 'private';
	vaultVisibility?:   'public' | 'tribe_friends' | 'friends' | 'private';
	dmPermissions?:     'everyone' | 'friends_tribe' | 'friends' | 'none';
	friendRequests?:    'everyone' | 'mutuals' | 'none';
	allowTribeInvites?: boolean;
	allowTradeRequests?: boolean;
	appearInSuggestions?: boolean;
};

async function loadPrivacyRaw(userId: number): Promise<PrivacySettings> {
	const row = await db.user.findUnique({
		where: { id: userId },
		select: { settings: true }
	});
	const settings = (row?.settings as Record<string, unknown> | null) ?? {};
	return ((settings.privacy as PrivacySettings) ?? {});
}

export async function canInviteToTribe(senderId: number, recipientId: number): Promise<boolean> {
	if (senderId === recipientId) return false;
	const p = await loadPrivacyRaw(recipientId);
	return p.allowTribeInvites !== false;
}

export async function canSendTradeOffer(senderId: number, recipientId: number): Promise<boolean> {
	if (senderId === recipientId) return false;
	const p = await loadPrivacyRaw(recipientId);
	return p.allowTradeRequests !== false;
}

export async function appearsInSuggestions(userId: number): Promise<boolean> {
	const p = await loadPrivacyRaw(userId);
	return p.appearInSuggestions !== false;
}

async function loadPrivacy(userId: number): Promise<PrivacySettings> {
	const row = await db.user.findUnique({
		where: { id: userId },
		select: { settings: true }
	});
	const settings = (row?.settings as Record<string, unknown> | null) ?? {};
	return ((settings.privacy as PrivacySettings) ?? {});
}

async function areFriends(a: number, b: number): Promise<boolean> {
	if (a === b) return true;
	const row = await db.friendship.findFirst({
		where: {
			status: 'accepted',
			OR: [
				{ userId: a, friendUserId: b },
				{ userId: b, friendUserId: a }
			]
		},
		select: { id: true }
	});
	return !!row;
}

async function shareTribe(a: number, b: number): Promise<boolean> {
	if (a === b) return true;
	const memberships = await db.tribeMembership.findMany({
		where: { userId: { in: [a, b] } },
		select: { userId: true, tribeId: true }
	});
	const aTribes = new Set(memberships.filter(m => m.userId === a).map(m => m.tribeId));
	return memberships.some(m => m.userId === b && aTribes.has(m.tribeId));
}

async function hasMutualFriend(a: number, b: number): Promise<boolean> {
	// Pull both users' accepted-friend lists and intersect.
	const [aF, bF] = await Promise.all([
		db.friendship.findMany({
			where: { status: 'accepted', OR: [{ userId: a }, { friendUserId: a }] },
			select: { userId: true, friendUserId: true }
		}),
		db.friendship.findMany({
			where: { status: 'accepted', OR: [{ userId: b }, { friendUserId: b }] },
			select: { userId: true, friendUserId: true }
		})
	]);
	const aFriends = new Set(aF.map(r => r.userId === a ? r.friendUserId : r.userId));
	for (const r of bF) {
		const other = r.userId === b ? r.friendUserId : r.userId;
		if (aFriends.has(other)) return true;
	}
	return false;
}

// ─── Public checks ─────────────────────────────────────────────────────

export async function canViewProfile(viewerId: number | null, targetId: number): Promise<boolean> {
	if (viewerId === targetId) return true;
	const p = await loadPrivacy(targetId);
	const level = p.profileVisibility ?? 'public';
	if (level === 'public') return true;
	if (!viewerId) return false; // any non-public level requires sign-in
	if (level === 'survivors') return true;
	if (level === 'private') return false;
	if (level === 'friends') return areFriends(viewerId, targetId);
	if (level === 'tribe_friends') {
		const [f, t] = await Promise.all([areFriends(viewerId, targetId), shareTribe(viewerId, targetId)]);
		return f || t;
	}
	return false;
}

export async function canViewVault(viewerId: number | null, targetId: number): Promise<boolean> {
	if (viewerId === targetId) return true;
	const p = await loadPrivacy(targetId);
	const level = p.vaultVisibility ?? 'public';
	if (level === 'public') return true;
	if (!viewerId) return false;
	if (level === 'private') return false;
	if (level === 'friends') return areFriends(viewerId, targetId);
	if (level === 'tribe_friends') {
		const [f, t] = await Promise.all([areFriends(viewerId, targetId), shareTribe(viewerId, targetId)]);
		return f || t;
	}
	return false;
}

export async function canSendDM(senderId: number, recipientId: number): Promise<boolean> {
	if (senderId === recipientId) return false;
	const p = await loadPrivacy(recipientId);
	const level = p.dmPermissions ?? 'everyone';
	if (level === 'none') return false;
	if (level === 'everyone') return true;
	if (level === 'friends') return areFriends(senderId, recipientId);
	if (level === 'friends_tribe') {
		const [f, t] = await Promise.all([areFriends(senderId, recipientId), shareTribe(senderId, recipientId)]);
		return f || t;
	}
	return true;
}

export async function canSendFriendRequest(senderId: number, recipientId: number): Promise<boolean> {
	if (senderId === recipientId) return false;
	const p = await loadPrivacy(recipientId);
	const level = p.friendRequests ?? 'everyone';
	if (level === 'none') return false;
	if (level === 'everyone') return true;
	if (level === 'mutuals') return hasMutualFriend(senderId, recipientId);
	return true;
}
