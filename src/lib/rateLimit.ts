interface Bucket {
	count: number;
	resetAt: number;
}

const store = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
	const now = Date.now();
	const bucket = store.get(key);
	if (!bucket || now > bucket.resetAt) {
		store.set(key, { count: 1, resetAt: now + windowMs });
		return false;
	}
	if (bucket.count >= max) return true;
	bucket.count++;
	return false;
}
