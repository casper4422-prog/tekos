import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { aggregateBadgesByCategory } from '$lib/badges';

export type DossierBreedingProject = {
    id: number;
    creatureId: number;
    focusStat: string;
    targetMutations: number;
};

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        return {
            profile: null,
            creatures: [],
            stats: { specimens: 0, badges: 0, friends: 0, tradeRep: null as number | null },
            tribe: null,
            recentBoss: [],
            badgeWall: { bloodline: [], bossReady: [], roles: [], underdog: [] },
            breedingProjects: [] as DossierBreedingProject[],
            activeTrades: { myListings: [], pendingOffers: [] },
            recentActivity: [],
            notifications: { unreadCount: 0, latest: [] }
        };
    }
    const userId = locals.user.id;

    const [
        user, creatureRows, friendCount, membership, bossRecords, tradeRatings,
        myListings, pendingOffers, recentActivity, unreadNotifsCount, latestNotifs
    ] = await Promise.all([
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
            include: {
                tribe: {
                    select: {
                        id: true, name: true, mainMap: true, flagImage: true, colors: true,
                        _count: { select: { members: true } }
                    }
                }
            }
        }),
        db.bossRecord.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 6
        }),
        db.tradeRating.findMany({ where: { ratedUserId: userId }, select: { rating: true } }),
        // My open listings on the marketplace
        db.trade.findMany({
            where: { userId, status: 'open' },
            select: {
                id: true, listingType: true, wanted: true, price: true, createdAt: true,
                creatureData: true, metadata: true,
                _count: { select: { offers: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 6
        }),
        // Offers other survivors have sent ME, waiting for my response
        db.offer.findMany({
            where: { toUserId: userId, status: 'pending' },
            include: {
                fromUser: { select: { id: true, nickname: true, discordName: true } },
                trade: { select: { id: true, listingType: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 6
        }),
        // Broader activity feed — things I've done across the site
        db.activityEvent.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10
        }),
        db.notification.count({ where: { userId, read: false } }),
        db.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5
        })
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
        badgeWall.roles.length +
        badgeWall.underdog.length;

    // Breeding projects — pulled from the BreedingProject table now.
    // First-load migration: if the user has no rows but has legacy
    // pinnedCreatures JSON, backfill the JSON entries with non-null
    // focusStat into the new table once, then clear the JSON so we
    // don't re-backfill. Bare-id entries (legacy "featured" pins)
    // are silently skipped — without a focus stat there's nothing
    // to track as a breeding goal.
    let breedingProjects: DossierBreedingProject[] = [];
    {
        const rows = await db.breedingProject.findMany({
            where: { userId },
            orderBy: { pinnedAt: 'asc' }
        });

        if (rows.length === 0 && Array.isArray(user?.pinnedCreatures) && (user!.pinnedCreatures as unknown[]).length > 0) {
            const legacy = user!.pinnedCreatures as unknown[];
            const candidates: Array<{ creatureId: number; focusStat: string; targetMutations: number }> = [];
            for (const entry of legacy) {
                if (entry && typeof entry === 'object' && 'creatureId' in entry && 'focusStat' in entry) {
                    const e = entry as { creatureId: unknown; focusStat: unknown; targetMutations?: unknown };
                    const cid = Number(e.creatureId);
                    const stat = typeof e.focusStat === 'string' ? e.focusStat : null;
                    if (Number.isFinite(cid) && stat) {
                        candidates.push({
                            creatureId: cid,
                            focusStat: stat,
                            targetMutations: Math.max(0, Math.min(99, Number(e.targetMutations) || 0))
                        });
                    }
                }
            }
            if (candidates.length > 0) {
                const ownedIds = new Set(
                    (await db.creature.findMany({
                        where: { userId, id: { in: candidates.map(c => c.creatureId) } },
                        select: { id: true }
                    })).map(c => c.id)
                );
                const validRows = candidates
                    .filter(c => ownedIds.has(c.creatureId))
                    .map(c => ({ ...c, userId }));
                if (validRows.length > 0) {
                    await db.breedingProject.createMany({ data: validRows, skipDuplicates: true });
                }
            }
            // Always clear the legacy JSON after the one-shot attempt — even
            // if nothing valid was found (otherwise we'd retry on every load).
            await db.user.update({ where: { id: userId }, data: { pinnedCreatures: [] } });

            const refreshed = await db.breedingProject.findMany({
                where: { userId },
                orderBy: { pinnedAt: 'asc' }
            });
            breedingProjects = refreshed.map(r => ({
                id: r.id,
                creatureId: r.creatureId,
                focusStat: r.focusStat,
                targetMutations: r.targetMutations
            }));
        } else {
            breedingProjects = rows.map(r => ({
                id: r.id,
                creatureId: r.creatureId,
                focusStat: r.focusStat,
                targetMutations: r.targetMutations
            }));
        }
    }

    // Shape tribe with role + member count for the Tribe Snapshot card
    const tribe = membership?.tribe ? {
        id: membership.tribe.id,
        name: membership.tribe.name,
        mainMap: membership.tribe.mainMap,
        flagImage: membership.tribe.flagImage,
        colors: membership.tribe.colors,
        myRole: membership.role,
        memberCount: membership.tribe._count.members
    } : null;

    // Shape Active Trades — my open listings + pending offers to me
    const activeTrades = {
        myListings: myListings.map(t => {
            const cd = (t.creatureData as Record<string, unknown> | null) ?? null;
            const meta = (t.metadata as Record<string, unknown> | null) ?? null;
            return {
                id: t.id,
                listingType: t.listingType,
                wanted: t.wanted,
                price: t.price,
                createdAt: t.createdAt,
                offerCount: t._count.offers,
                species: cd?.species ?? meta?.wantedSpecies ?? null,
                name: cd?.name ?? null,
                direction: (meta?.direction as string) ?? 'sell'
            };
        }),
        pendingOffers: pendingOffers.map(o => ({
            id: o.id,
            tradeId: o.tradeId,
            listingType: o.trade.listingType,
            fromId: o.fromUser.id,
            fromName: o.fromUser.nickname ?? o.fromUser.discordName ?? 'Survivor',
            message: o.message,
            createdAt: o.createdAt
        }))
    };

    return {
        profile: user,
        creatures,
        stats: {
            specimens: creatures.length,
            badges:    totalBadges,
            friends:   friendCount,
            tradeRep
        },
        tribe,
        recentBoss: bossRecords,
        badgeWall,
        breedingProjects,
        activeTrades,
        recentActivity: recentActivity.map(a => ({
            id: a.id,
            type: a.type,
            data: a.data,
            createdAt: a.createdAt
        })),
        notifications: {
            unreadCount: unreadNotifsCount,
            latest: latestNotifs.map(n => ({
                id: n.id,
                type: n.type,
                payload: n.payload,
                read: n.read,
                createdAt: n.createdAt
            }))
        }
    };
};
