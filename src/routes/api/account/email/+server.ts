import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import bcrypt from 'bcryptjs';

// POST /api/account/email — change the signed-in user's email.
// Body: { currentPassword: string, newEmail: string }
export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	const body = await request.json().catch(() => ({} as Record<string, unknown>));
	const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
	const newEmail = typeof body.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : '';

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
		return json({ error: 'Invalid email format' }, { status: 400 });
	}

	const user = await db.user.findUnique({ where: { id: uid }, select: { id: true, email: true, passwordHash: true } });
	if (!user) return json({ error: 'User not found' }, { status: 404 });
	if (newEmail === user.email.toLowerCase()) {
		return json({ error: 'This is already your email' }, { status: 400 });
	}

	if (!user.passwordHash) return json({ error: 'Password verification not available — sign in with email first' }, { status: 400 });
	const ok = await bcrypt.compare(currentPassword, user.passwordHash);
	if (!ok) return json({ error: 'Current password is incorrect' }, { status: 403 });

	const existing = await db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
	if (existing && existing.id !== uid) {
		return json({ error: 'Another account already uses that email' }, { status: 409 });
	}

	await db.user.update({ where: { id: uid }, data: { email: newEmail } });
	return json({ ok: true, email: newEmail });
};
