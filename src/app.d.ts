declare global {
	namespace App {
		interface Locals {
			user: { id: number; email: string; nickname: string | null } | null;
		}
		interface PageData {}
		interface PageState {}
		interface Platform {}
	}
}

export {};
