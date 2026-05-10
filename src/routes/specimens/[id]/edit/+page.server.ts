import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = parseInt(params.id);
	const row = await db.creature.findFirst({ where: { id, userId: locals.user!.id } });
	if (!row) error(404, 'Specimen not found');
	return { creature: { ...row.data as Record<string,unknown>, id: row.id } };
};
