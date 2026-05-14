import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import bcrypt from 'bcryptjs';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const user = await db.user.findUnique({
		where: { id: locals.user.id },
		select: { id: true, email: true, nickname: true, discordName: true, bio: true, bannerImage: true, lookingFor: true, pinnedCreatures: true, lastSeen: true, createdAt: true }
	});
	return json(user);
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const { nickname, bio, lookingFor, bannerImage, avatarImage, currentPassword, newPassword } = await request.json();

	if (newPassword) {
		if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 200) return json({ error: 'Password must be 8–200 characters' }, { status: 400 });
		const user = await db.user.findUnique({ where: { id: locals.user.id } });
		if (!user?.passwordHash) return json({ error: 'No password set' }, { status: 400 });
		const ok = await bcrypt.compare(currentPassword ?? '', user.passwordHash);
		if (!ok) return json({ error: 'Current password is incorrect' }, { status: 403 });
		const passwordHash = await bcrypt.hash(newPassword, 12);
		await db.user.update({ where: { id: locals.user.id }, data: { passwordHash } });
	}

	const updated = await db.user.update({
		where: { id: locals.user.id },
		data: {
			nickname: nickname ?? undefined,
			bio: bio ?? undefined,
			lookingFor: lookingFor ?? undefined,
			bannerImage: bannerImage ?? undefined,
			avatarImage: avatarImage ?? undefined
		},
		select: { id: true, email: true, nickname: true, bio: true, lookingFor: true, bannerImage: true, avatarImage: true }
	});
	return json(updated);
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const { password } = await request.json().catch(() => ({}));
	if (!password) return json({ error: 'Password required to delete account' }, { status: 400 });
	const user = await db.user.findUnique({ where: { id: locals.user.id } });
	// Discord-only users (no password) must confirm by sending their nickname as confirmation
	if (!user?.passwordHash) {
		if (password !== user?.nickname) return json({ error: 'Enter your survivor name to confirm deletion' }, { status: 403 });
	} else {
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return json({ error: 'Incorrect password' }, { status: 403 });
	}
	await db.user.delete({ where: { id: locals.user.id } });
	return json({ ok: true });
};
