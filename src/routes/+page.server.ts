import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    // Signed-in users skip the landing
    if (locals.user) throw redirect(302, '/dossier');
    return {};
};
