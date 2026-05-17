import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { aggregateBadgesByCategory, type Stats } from '$lib/badges';
import { canViewProfile, canViewVault } from '$lib/privacy';

export const load: PageServerLoad = async ({ params, locals }) => {
    const targetId = parseInt(params.id);
    if (!Number.isFinite(targetId)) throw error(404, 'Survivor not found');
    const myId = locals.user?.id ?? -1;

    // Profile visibility gate — 404 (rather than 403) so private accounts are unenumerable.
    if (!(await canViewProfile(myId === -1 ? null : myId, targetId))) {
        throw error(404, 'Survivor not found');
    }

    const vaultAllowed = await canViewVault(myId === -1 ? null : myId, targetId);

    const [user, creatureRows, friendCount, membership, tradeRatings] = await Promise.all([
        db.user.findUnique({
            where: { id: targetId },
            select: { id:true, nickname:true, discordName:true, bio:true, lookingFor:true, pinnedCreatures:true, createdAt:true, lastSeen:true }
        }),
        vaultAllowed
            ? db.creature.findMany({
                where: { userId: targetId },
                select: { id: true, data: true, createdAt: true },
                orderBy: { createdAt: 'desc' }
            })
            : Promise.resolve([] as Array<{ id: number; data: unknown; createdAt: Date }>),
        db.friendship.count({
            where: { OR: [{ userId:targetId, status:'accepted' }, { friendUserId:targetId, status:'accepted' }] }
        }),
        db.tribeMembership.findFirst({ where: { userId:targetId }, include: { tribe: { select: { id:true, name:true } } } }),
        db.tradeRating.findMany({ where: { ratedUserId: targetId }, select: { rating: true } })
    ]);

    if (!user) throw error(404, 'Survivor not found');

    const creatures = creatureRows.map(r => {
        const d = r.data as Record<string, unknown>;
        return {
            id: r.id,
            createdAt: r.createdAt,
            name:    String(d.name ?? 'Unnamed'),
            species: String(d.species ?? 'Unknown'),
            level:   Number(d.level ?? 1),
            gender:  String(d.gender ?? 'Unknown'),
            baseStats: (d.baseStats as Stats) ?? {},
            mutations: (d.mutations as Stats) ?? {}
        };
    });

    const pinnedIds = Array.isArray(user.pinnedCreatures) ? user.pinnedCreatures as number[] : [];
    const pinned = pinnedIds.map(id => creatures.find(c => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
    const speciesOwned = new Set(creatures.map(c => c.species)).size;

    const tradeRep = tradeRatings.length
        ? Math.round((tradeRatings.reduce((s, r) => s + r.rating, 0) / tradeRatings.length) * 10) / 10
        : null;

    const badgeWall = aggregateBadgesByCategory(creatures);
    const totalBadges = badgeWall.bloodline.length + badgeWall.bossReady.length + badgeWall.roles.length;

    const now = Date.now();
    const isOnline = user.lastSeen ? (now - new Date(user.lastSeen).getTime()) < 5 * 60 * 1000 : false;

    const friendship = myId !== targetId && myId !== -1
        ? await db.friendship.findFirst({
            where: { OR: [{ userId: myId, friendUserId: targetId }, { userId: targetId, friendUserId: myId }] }
        })
        : null;

    // Display-flag preferences (set by the target survivor in Settings → Privacy).
    // The viewer themselves always sees everything regardless of these flags.
    const targetSettings = await db.user.findUnique({
        where: { id: targetId },
        select: { settings: true }
    });
    const targetPrivacy = ((targetSettings?.settings as Record<string, unknown> | null)?.privacy ?? {}) as Record<string, unknown>;
    const viewingSelf = myId === targetId;
    const display = {
        showBreeding:      viewingSelf || targetPrivacy.showBreeding !== false,
        showFoundersIndex: viewingSelf || targetPrivacy.showFoundersIndex !== false,
        showOnline:        viewingSelf || targetPrivacy.showOnline !== false,
        showActivity:      viewingSelf || targetPrivacy.showActivity !== false,
        showVaultCount:    viewingSelf || targetPrivacy.showVaultCount !== false,
        showBadges:        viewingSelf || targetPrivacy.showBadges !== false
    };

    return {
        profile: user,
        creatures,
        pinned,
        speciesOwned,
        stats: {
            specimens: display.showVaultCount ? creatures.length : null,
            badges: display.showBadges ? totalBadges : null,
            friends: friendCount,
            tradeRep
        },
        tribe: membership?.tribe ?? null,
        isOnline: display.showOnline ? isOnline : false,
        friendship,
        isSelf: viewingSelf,
        badgeWall: display.showBadges ? badgeWall : { bloodline: [], bossReady: [], roles: [], underdog: [] },
        vaultHidden: !vaultAllowed,
        display
    };
};
