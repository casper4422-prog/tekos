import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');
    const user = await db.user.findUnique({
        where: { id: locals.user.id },
        select: { id: true, nickname: true, email: true, createdAt: true }
    });
    return {
        displayName: user?.nickname ?? user?.email?.split('@')[0] ?? 'Survivor'
    };
};
