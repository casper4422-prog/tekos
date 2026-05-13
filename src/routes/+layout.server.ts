import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';

// These routes are accessible without a full account (guest/offline mode)
const GUEST_PATHS = ['/dex', '/login', '/api/auth', '/specimens', '/dossier'];

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const isLanding = url.pathname === '/';
	const isPublic = isLanding || url.pathname.startsWith('/login') || url.pathname.startsWith('/api/auth');
	const isGuest  = GUEST_PATHS.some(p => url.pathname.startsWith(p));

	if (!locals.user && !isPublic && !isGuest) redirect(302, '/login');

	const unreadCount = locals.user
		? await db.notification.count({ where: { userId: locals.user.id, read: false } }).catch(() => 0)
		: 0;

	if (locals.user) {
		await db.user.update({ where: { id: locals.user.id }, data: { lastSeen: new Date() } }).catch(() => {});
	}

	return { user: locals.user, unreadCount };
};
