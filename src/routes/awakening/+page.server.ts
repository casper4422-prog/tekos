import { redirect } from '@sveltejs/kit';

// /awakening used to be a 6-scene auto-advancing onboarding slideshow.
// It's been replaced by SNTO — the resident guide drone — which lives in
// the global layout and is available everywhere. The route stays as a 308
// so old links and bookmarks land somewhere useful.
export function load() {
    throw redirect(308, '/dossier');
}
