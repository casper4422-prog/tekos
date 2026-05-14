import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { signToken } from '$lib/auth';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	if (!code) redirect(302, '/login?error=no_code');

	const state = url.searchParams.get('state');
	const storedState = cookies.get('discord_oauth_state');
	cookies.delete('discord_oauth_state', { path: '/' });
	if (!state || !storedState || state !== storedState) redirect(302, '/login?error=invalid_state');

	const clientId = process.env.DISCORD_CLIENT_ID!;
	const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
	const redirectUri = process.env.DISCORD_REDIRECT_URI ?? 'http://localhost:5173/api/auth/discord/callback';

	// Exchange code for token
	const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', code, redirect_uri: redirectUri })
	});
	const tokenData = await tokenRes.json();
	if (!tokenData.access_token) redirect(302, '/login?error=token_exchange');

	// Get Discord user profile
	const profileRes = await fetch('https://discord.com/api/users/@me', {
		headers: { Authorization: `Bearer ${tokenData.access_token}` }
	});
	const profile = await profileRes.json();
	if (!profile.id) redirect(302, '/login?error=profile_fetch');

	const discordEmail = profile.email ?? `discord_${profile.id}@tekos.local`;
	const discordName = profile.global_name ?? profile.username;

	// Find or create user — match by discordId only, never by email
	let user = await db.user.findFirst({ where: { discordId: profile.id } });
	if (!user) {
		// Guard: if this email already belongs to a password account, don't auto-link
		const existingByEmail = await db.user.findFirst({ where: { email: discordEmail } });
		if (existingByEmail?.passwordHash) redirect(302, '/login?error=email_in_use');
		user = await db.user.create({ data: { email: discordEmail, discordId: profile.id, discordName, nickname: null } });
	} else {
		await db.user.update({ where: { id: user.id }, data: { discordId: profile.id, discordName, lastSeen: new Date() } });
	}

	const token = await signToken({ userId: user.id, email: user.email });
	cookies.set('tek_session', token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, secure: process.env.NODE_ENV === 'production' });

	redirect(302, '/dossier');
};
