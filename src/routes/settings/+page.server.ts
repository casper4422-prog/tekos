import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { profile: null, settings: {} };
	}
	const user = await db.user.findUnique({
		where: { id: locals.user.id },
		select: {
			id: true,
			email: true,
			nickname: true,
			bio: true,
			lookingFor: true,
			discordName: true,
			bannerImage: true,
			avatarImage: true,
			settings: true,
			createdAt: true
		}
	});
	const settings = (user?.settings as Record<string, unknown> | null) ?? {};
	return {
		profile: user
			? {
					id: user.id,
					email: user.email,
					nickname: user.nickname,
					bio: user.bio,
					lookingFor: user.lookingFor,
					discordName: user.discordName,
					bannerImage: user.bannerImage,
					avatarImage: user.avatarImage,
					createdAt: user.createdAt
				}
			: null,
		settings
	};
};
