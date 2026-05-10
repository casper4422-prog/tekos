import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const isPublic = url.pathname.startsWith('/login') || url.pathname.startsWith('/api/auth');
	if (!locals.user && !isPublic) redirect(302, '/login');
	return { user: locals.user };
};
