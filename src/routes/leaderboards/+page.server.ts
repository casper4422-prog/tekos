import { redirect } from '@sveltejs/kit';

// Leaderboards have been retired — Badge Archive is the new progression layer.
export function load() {
    throw redirect(308, '/badges');
}
