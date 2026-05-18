import { redirect } from '@sveltejs/kit';
import { randomBytes } from 'crypto';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const clientId = process.env.DISCORD_CLIENT_ID;
	const isProd = process.env.NODE_ENV === 'production';
	const redirectUri = process.env.DISCORD_REDIRECT_URI ?? (isProd ? '' : 'http://localhost:5173/api/auth/discord/callback');
	if (!clientId || !redirectUri) {
		console.error('[discord-oauth] Missing DISCORD_CLIENT_ID or DISCORD_REDIRECT_URI');
		redirect(302, '/login?error=discord_misconfigured');
	}
	const state = randomBytes(16).toString('hex');
	cookies.set('discord_oauth_state', state, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600, secure: isProd });
	const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email&state=${state}`;
	redirect(302, url);
};
