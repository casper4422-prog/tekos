declare global {
	namespace App {
		interface Locals {
			user: { id: number; email: string; nickname: string | null } | null;
		}
		interface PageData {}
		interface PageState {}
		interface Platform {}
	}
	interface Window {
		EXPANDED_SPECIES_DATABASE?: Record<string, Record<string, unknown>>;
	}
}

export {};
