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

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	await db.user.delete({ where: { id: locals.user.id } });
	return json({ ok: true });
};
