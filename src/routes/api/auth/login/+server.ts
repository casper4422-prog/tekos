import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { signToken, sessionCookie } from '$lib/auth';
import bcrypt from 'bcryptjs';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { identifier, password } = await request.json();
	if (!identifier || !password) return json({ error: 'Missing fields' }, { status: 400 });

	const user = await db.user.findFirst({
		where: { OR: [{ email: identifier }, { nickname: identifier }] }
	});
	if (!user || !user.passwordHash) return json({ error: 'Invalid credentials' }, { status: 401 });

	const ok = await bcrypt.compare(password, user.passwordHash);
	if (!ok) return json({ error: 'Invalid credentials' }, { status: 401 });

	await db.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } });

	const token = await signToken({ userId: user.id, email: user.email });
	cookies.set('tek_session', token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, secure: process.env.NODE_ENV === 'production' });

	return json({ ok: true, user: { id: user.id, email: user.email, nickname: user.nickname } });
};
