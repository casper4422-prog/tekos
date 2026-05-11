import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);
	const row = await db.creature.findUnique({ where: { id }, include: { user: { select: { id:true, nickname:true, email:true } } } });
	if (!row) error(404, 'Specimen not found');
	return { creature: { ...row.data as Record<string,unknown>, id: row.id, createdAt: row.createdAt }, owner: row.user };
};
