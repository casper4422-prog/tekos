import { SignJWT, jwtVerify } from 'jose';
import { error } from '@sveltejs/kit';

const COOKIE_NAME = 'tek_session';
const EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
	const s = process.env.JWT_SECRET;
	if (!s) throw new Error('JWT_SECRET env var is not set');
	return new TextEncoder().encode(s);
}

export async function signToken(payload: { userId: number; email: string }) {
	return new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${EXPIRY_SECONDS}s`)
		.sign(getSecret());
}

export async function verifyToken(token: string) {
	try {
		const { payload } = await jwtVerify(token, getSecret());
		return payload as { userId: number; email: string };
	} catch {
		return null;
	}
}

export function sessionCookie(token: string) {
	return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${EXPIRY_SECONDS}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function clearCookie() {
	return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`;
}

export { COOKIE_NAME };

export function requireUser(locals: App.Locals): NonNullable<App.Locals['user']> & { id: number } {
	if (!locals.user) throw error(401, 'Unauthorized');
	return locals.user as NonNullable<App.Locals['user']> & { id: number };
}
