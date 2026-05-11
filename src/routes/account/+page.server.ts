import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await db.user.findUnique({
		where: { id: locals.user!.id },
		select: { id:true, email:true, nickname:true, bio:true, lookingFor:true, discordName:true, createdAt:true }
	});
	return { profile: user };
};
