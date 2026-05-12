import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { aggregateBadgesByCategory } from '$lib/badges';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        return {
            profile: null,
            creatures: [],
            stats: { specimens: 0, badges: 0, friends: 0, tradeRep: null as number | null },
            tribe: null,
            recentBoss: [],
            badgeWall: { bloodline: [], bossReady: [], roles: [] },
            pinnedIds: [] as number[]
        };
    }
    const userId = locals.user.id;

    const [user, creatureRows, friendCount, membership, bossRecords, tradeRatings] = await Promise.all([
        db.user.findUnique({
            where: { id: userId },
            select: {
                id: true, email: true, nickname: true, discordName: true,
                bio: true, lookingFor: true, createdAt: true,
                pinnedCreatures: true
            }
        }),
        db.creature.findMany({
            where: { userId },
            select: { id: true, data: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        }),
        db.friendship.count({
            where: { OR: [{ userId, status: 'accepted' }, { friendUserId: userId, status: 'accepted' }] }
        }),
        db.tribeMembership.findFirst({
            where: { userId },
            include: { tribe: { select: { id: true, name: true, mainMap: true, flagImage: true, colors: true } } }
        }),
        db.bossRecord.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 6
        }),
        db.tradeRating.findMany({ where: { ratedUserId: userId }, select: { rating: true } })
    ]);

    // Shape creatures for UI
    const creatures = creatureRows.map(r => {
        const d = r.data as Record<string, unknown>;
        return {
            id: r.id,
            createdAt: r.createdAt,
            name:     String(d.name ?? 'Unnamed'),
            species:  String(d.species ?? 'Unknown'),
            level:    Number(d.level ?? 1),
            gender:   String(d.gender ?? 'Unknown'),
            baseStats:  (d.baseStats as Record<string, number>) ?? {},
            mutations:  (d.mutations as Record<string, number>) ?? {},
            notes:    typeof d.notes === 'string' ? d.notes : undefined,
            server:   typeof d.server === 'string' ? d.server : undefined
        };
    });

    // Trade rep average (out of 5)
    const tradeRep = tradeRatings.length
        ? Math.round((tradeRatings.reduce((s, r) => s + r.rating, 0) / tradeRatings.length) * 10) / 10
        : null;

    // Badge aggregation
    const badgeWall = aggregateBadgesByCategory(creatures);
    const totalBadges =
        badgeWall.bloodline.length +
        badgeWall.bossReady.length +
        badgeWall.roles.length;

    // Pinned creature ids
    const pinnedIds = Array.isArray(user?.pinnedCreatures)
        ? (user!.pinnedCreatures as number[]).filter(n => typeof n === 'number')
        : [];

    return {
        profile: user,
        creatures,
        stats: {
            specimens: creatures.length,
            badges:    totalBadges,
            friends:   friendCount,
            tradeRep
        },
        tribe: membership?.tribe ?? null,
        recentBoss: bossRecords,
        badgeWall,
        pinnedIds
    };
};
