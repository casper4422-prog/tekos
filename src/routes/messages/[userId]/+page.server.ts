import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Messages is back as a top-level nav route — /messages/[userId] redirects
// to the main page with the partner preselected via the ?with= query param,
// matching MessagesPanel's internal navigation pattern.
export const load: PageServerLoad = async ({ params }) => {
	throw redirect(302, `/messages?with=${params.userId}`);
};
