import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { intParam } from '$lib/params';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) redirect(302, '/login');
	const id = intParam(params.id);
	const row = await db.creature.findFirst({ where: { id, userId: locals.user.id } });
	if (!row) error(404, 'Specimen not found');
	return { creature: { ...row.data as Record<string,unknown>, id: row.id } };
};
