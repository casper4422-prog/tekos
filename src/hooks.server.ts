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
	return resolve(event);
};
