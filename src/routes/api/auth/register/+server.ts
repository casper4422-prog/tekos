import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { signToken } from '$lib/auth';
import bcrypt from 'bcryptjs';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { email, password, nickname } = await request.json();
	if (!email || !password) return json({ error: 'Email and password required' }, { status: 400 });
	if (typeof password !== 'string' || password.length < 8 || password.length > 200) return json({ error: 'Password must be 8–200 characters' }, { status: 400 });

	const existing = await db.user.findFirst({ where: { OR: [{ email }, ...(nickname ? [{ nickname }] : [])] } });
	if (existing) return json({ error: 'Email or nickname already taken' }, { status: 409 });

	const passwordHash = await bcrypt.hash(password, 12);
	const user = await db.user.create({ data: { email, passwordHash, nickname: nickname || null } });

	const token = await signToken({ userId: user.id, email: user.email });
	cookies.set('tek_session', token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, secure: process.env.NODE_ENV === 'production' });

	return json({ ok: true, user: { id: user.id, email: user.email, nickname: user.nickname } });
};
