import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';

/**
 * DELETE /api/tribe-creatures/[id]
 * Removes a creature from the tribe's shared vault.
 *
 * Permissions: the original creator OR the tribe owner/admin of the same tribe.
 *   - Creator can always remove their own contribution
 *   - Owner/admin can moderate any contribution
 *   - Plain members cannot remove someone else's creature (griefing prevention)
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
    const uid = requireUser(locals).id;
    const id = Number(params.id);
    if (!Number.isFinite(id) || id <= 0) return json({ error: 'Bad id' }, { status: 400 });

    const tc = await db.tribeCreature.findUnique({
        where: { id },
        select: { id: true, tribeId: true, createdByUserId: true }
    });
    if (!tc) return json({ error: 'Not found' }, { status: 404 });

    const membership = await db.tribeMembership.findFirst({
        where: { userId: uid, tribeId: tc.tribeId },
        select: { role: true }
    });
    if (!membership) return json({ error: 'Not a member of this tribe' }, { status: 403 });

    const isCreator   = tc.createdByUserId === uid;
    const isModerator = membership.role === 'owner' || membership.role === 'admin';
    if (!isCreator && !isModerator) {
        return json({ error: 'Only the contributor or a tribe owner/admin can remove this entry.' }, { status: 403 });
    }

    await db.tribeCreature.delete({ where: { id } });
    return json({ ok: true });
};
