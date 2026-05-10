import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const notifs = await db.notification.findMany({ where:{ userId:locals.user!.id }, orderBy:{ createdAt:'desc' }, take:50 });
	return { notifs };
};
