import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const isPublic = url.pathname.startsWith('/login') || url.pathname.startsWith('/api/auth');
	if (!locals.user && !isPublic) redirect(302, '/login');

	const unreadCount = locals.user
		? await db.notification.count({ where: { userId: locals.user.id, read: false } }).catch(() => 0)
		: 0;

	// Update last_seen on every authenticated page load
	if (locals.user) {
		await db.user.update({ where: { id: locals.user.id }, data: { lastSeen: new Date() } }).catch(() => {});
	}

	return { user: locals.user, unreadCount };
};
