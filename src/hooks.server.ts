import type { Handle } from '@sveltejs/kit';
import { verifyToken, COOKIE_NAME } from '$lib/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(COOKIE_NAME);
	if (token) {
		const payload = await verifyToken(token);
		if (payload) {
			event.locals.user = { id: payload.userId, email: payload.email, nickname: null };
			// Lazily load nickname — pages that need it will fetch from DB directly
		}
	} else {
		event.locals.user = null;
	}

	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('Content-Security-Policy',
		"default-src 'self'; " +
		"img-src 'self' data: https:; " +
		"font-src 'self' https://fonts.gstatic.com; " +
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
		"script-src 'self' 'unsafe-inline'; " +
		"connect-src 'self' https://discord.com;"
	);
	return response;
};
