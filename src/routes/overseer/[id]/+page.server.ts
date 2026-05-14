import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = parseInt(params.id);
	const session = await db.arenaSession.findUnique({
		where: { id },
		include: {
			creator: { select:{ id:true, nickname:true, discordName:true } },
			members: { include:{ user:{ select:{ id:true, nickname:true, discordName:true } } } },
			creatures: { include:{ user:{ select:{ nickname:true, discordName:true } } } },
			chats: { include:{ user:{ select:{ nickname:true, discordName:true } } }, orderBy:{ createdAt:'asc' }, take:100 }
		}
	});
	if (!session) error(404, 'War Room not found');

	// Auto-join
	const already = session.members.find(m => m.userId === locals.user!.id);
	if (!already && session.status === 'open') {
		await db.arenaSessionMember.create({ data:{ sessionId:id, userId:locals.user!.id } });
	}

	const myCreatures = await db.creature.findMany({ where:{ userId:locals.user!.id }, select:{ id:true, data:true } });

	return { session, myId: locals.user!.id, myCreatures: myCreatures.map(c => ({ ...c.data as object, id:c.id })) };
};
