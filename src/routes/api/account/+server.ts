import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import bcrypt from 'bcryptjs';

// DELETE /api/account — permanently delete the signed-in user's account.
// Body: { currentPassword?: string, confirmText: string }
// Confirmation phrase must match the user's nickname (or email if no nickname).
export const DELETE: RequestHandler = async ({ request, locals, cookies }) => {
	const uid = requireUser(locals).id;
	const body = await request.json().catch(() => ({} as Record<string, unknown>));
	const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
	const confirmText = typeof body.confirmText === 'string' ? body.confirmText.trim() : '';

	const user = await db.user.findUnique({
		where: { id: uid },
		select: { id: true, email: true, nickname: true, passwordHash: true }
	});
	if (!user) return json({ error: 'User not found' }, { status: 404 });

	// If a password is set, require it. Otherwise (Discord-only accounts) allow the typed phrase alone.
	if (user.passwordHash) {
		const ok = await bcrypt.compare(currentPassword, user.passwordHash);
		if (!ok) return json({ error: 'Current password is incorrect' }, { status: 403 });
	}

	const expected = (user.nickname ?? user.email).toLowerCase();
	if (confirmText.toLowerCase() !== expected) {
		return json({ error: `Confirmation phrase must match your callsign (${user.nickname ?? user.email})` }, { status: 400 });
	}

	// Cascade deletes on related tables handle most cleanup. Trash the user row.
	await db.user.delete({ where: { id: uid } });

	// Clear the auth cookie so the client sees us logged out.
	cookies.delete('tek_session', { path: '/' });
	return json({ ok: true });
};
