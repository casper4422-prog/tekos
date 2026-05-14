import { error } from '@sveltejs/kit';

export function intParam(value: string | undefined, name = 'id'): number {
	const n = Number(value);
	if (!Number.isInteger(n) || n <= 0) throw error(400, `Invalid ${name}`);
	return n;
}
