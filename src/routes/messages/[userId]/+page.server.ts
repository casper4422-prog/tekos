import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// /messages/[userId] now lives inside /network as a tab + query param so the
// Friends/Messages/Survivors tab nav stays visible. Preserve any external
// links by redirecting to the new canonical URL.
export const load: PageServerLoad = async ({ params }) => {
	throw redirect(302, `/network?tab=messages&with=${params.userId}`);
};
