import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * BattleMetrics ARK: Survival Ascended server lookup.
 *
 * GET /api/cluster/lookup?host=1.2.3.4&port=27015
 *   → 200 { name, map, players, maxPlayers, online, battlemetricsId, raw } on match
 *   → 404 { error } when no server found at the address
 *   → 502 { error } when BattleMetrics is unreachable / rate-limits us
 *
 * The endpoint exists so the Settings "Add Server" form can resolve a real
 * server name from an IP:port pair instead of accepting "any green pip" as
 * the user types. Downstream Feed → Server scope reads the resolved name.
 */

type BattleMetricsServer = {
    type: 'server';
    id: string;
    attributes: {
        name: string;
        ip: string;
        port: number;
        players: number;
        maxPlayers: number;
        status: 'online' | 'offline' | 'dead';
        details?: {
            map?: string;
        };
    };
};

type BattleMetricsResponse = {
    data?: BattleMetricsServer[];
    errors?: Array<{ title: string; detail?: string }>;
};

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');

    const host = (url.searchParams.get('host') ?? '').trim();
    const port = (url.searchParams.get('port') ?? '').trim();

    if (!host) throw error(400, 'host parameter required');
    const portN = port ? Number(port) : 27015;
    if (!Number.isFinite(portN) || portN < 1 || portN > 65535) {
        throw error(400, 'port must be a number between 1 and 65535');
    }

    const params = new URLSearchParams({
        'filter[game]':   'arksa',
        'filter[search]': host,
        'page[size]':     '20'
    });

    try {
        const res = await fetch(`https://api.battlemetrics.com/servers?${params}`, {
            headers: { Accept: 'application/json' }
        });
        if (!res.ok) {
            throw error(502, `BattleMetrics returned ${res.status}`);
        }
        const body: BattleMetricsResponse = await res.json();
        if (!body.data || body.data.length === 0) return json({ found: false });

        const match = body.data.find(s => s.attributes.ip === host && s.attributes.port === portN)
                   ?? body.data.find(s => s.attributes.ip === host)
                   ?? body.data[0];

        return json({
            found: true,
            battlemetricsId: match.id,
            name:       match.attributes.name,
            map:        match.attributes.details?.map ?? null,
            players:    match.attributes.players,
            maxPlayers: match.attributes.maxPlayers,
            online:     match.attributes.status === 'online'
        });
    } catch (e: unknown) {
        if (e && typeof e === 'object' && 'status' in e) throw e; // Re-throw SvelteKit errors as-is
        throw error(502, 'BattleMetrics lookup failed');
    }
};
