import { redirect } from '@sveltejs/kit';

// /account has been merged into /settings (Account section).
export function load() {
    throw redirect(308, '/settings');
}
