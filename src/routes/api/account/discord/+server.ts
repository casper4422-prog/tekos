import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

// DELETE /api/account/discord — unlink Discord from the signed-in user.
// Refuses if the account has no password set (Discord would be the only auth path).
export const DELETE: RequestHandler = async ({ locals }) => {
	const uid = requireUser(locals).id;
	const user = await db.user.findUnique({ where: { id: uid }, select: { passwordHash: true, discordId: true } });
	if (!user) return json({ error: 'User not found' }, { status: 404 });
	if (!user.discordId) return json({ error: 'Discord is not linked' }, { status: 400 });
	if (!user.passwordHash) {
		return json({ error: 'Set a password first — Discord is currently your only sign-in method.' }, { status: 400 });
	}

	await db.user.update({ where: { id: uid }, data: { discordId: null, discordName: null } });
	return json({ ok: true });
};
