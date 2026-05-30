import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

// Loads only the data MessagesPanel needs: DM conversation list + open war-room
// chats the user is a member of. The Network page's server load returns a
// superset (friends/incoming/sent/suggested too) — those aren't needed here.
export const load: PageServerLoad = async ({ locals }) => {
    const uid = locals.user!.id;

    // Direct-message conversation list (most recent message per partner)
    const msgs = await db.directMessage.findMany({
        where: { OR: [{ fromUserId: uid }, { toUserId: uid }] },
        orderBy: { createdAt: 'desc' },
        include: {
            fromUser: { select: { id: true, nickname: true, discordName: true } },
            toUser:   { select: { id: true, nickname: true, discordName: true } }
        }
    });
    const seen = new Set<number>();
    const convos: Array<{
        userId: number;
        nickname: string | null;
        discordName: string | null;
        lastMessage: string;
        lastAt: Date;
        unread: number;
    }> = [];
    for (const m of msgs) {
        const otherId = m.fromUserId === uid ? m.toUserId : m.fromUserId;
        if (seen.has(otherId)) continue;
        seen.add(otherId);
        const other = m.fromUserId === uid ? m.toUser : m.fromUser;
        const unread = msgs.filter(x => x.fromUserId === otherId && x.toUserId === uid && !x.read).length;
        convos.push({
            userId: otherId,
            nickname: other.nickname,
            discordName: other.discordName,
            lastMessage: m.message,
            lastAt: m.createdAt,
            unread
        });
    }

    // Open war-room sessions the survivor is a member of — surfaced at the top
    // of the convo list so all active conversations live in one place.
    const memberships = await db.arenaSessionMember.findMany({
        where: { userId: uid, session: { status: 'open' } },
        include: {
            session: {
                select: {
                    id: true,
                    bossName: true,
                    difficulty: true,
                    joinCode: true,
                    createdAt: true,
                    chats: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, createdAt: true } }
                }
            }
        }
    });
    const warRooms = memberships.map(m => ({
        sessionId:   m.session.id,
        bossName:    m.session.bossName,
        difficulty:  m.session.difficulty ?? null,
        joinCode:    m.session.joinCode,
        lastMessage: m.session.chats[0]?.content ?? null,
        lastAt:      m.session.chats[0]?.createdAt ?? m.session.createdAt
    })).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

    return { convos, warRooms, myId: uid };
};
