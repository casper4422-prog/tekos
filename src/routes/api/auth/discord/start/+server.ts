import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const clientId = process.env.DISCORD_CLIENT_ID;
	const redirectUri = process.env.DISCORD_REDIRECT_URI ?? 'http://localhost:5173/api/auth/discord/callback';
	const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email`;
	redirect(302, url);
};
