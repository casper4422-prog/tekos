import { db } from '$lib/db';

export async function notify(userId: number, actorUserId: number, type: string, payload: Record<string,unknown> = {}) {
	if (userId === actorUserId) return; // never notify yourself
	await db.notification.create({ data: { userId, actorUserId, type, payload } }).catch(() => {});
}
