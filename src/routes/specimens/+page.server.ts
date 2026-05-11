import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	// Guest mode — return empty, page uses localStorage client-side
	if (!locals.user) return { creatures: [] };

	const rows = await db.creature.findMany({
		where: { userId: locals.user.id },
		orderBy: { createdAt: 'desc' }
	});
	const creatures = rows.map(r => ({ ...r.data as Record<string,unknown>, id: r.id, createdAt: r.createdAt }));
	return { creatures };
};
