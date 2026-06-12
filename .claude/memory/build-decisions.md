# TekOS — Locked Build Decisions

Technical decisions made during design that should carry over to the real Svelte implementation. Each decision was confirmed by the user during preview design.

## Server data ingest (Feed → Server tab)

**Decision: Use BOTH Option A and Option B together.**

- **Option A — Steam A2S query (read-only, always-on):**
  - Backend worker polls each subscribed server's query port every 30-60 seconds using the Steam A2S protocol
  - Returns: server name, current player count, max players, current map, password-protected status, uptime
  - Works for ANY public ARK server with no permissions or admin cooperation required
  - This is the baseline data layer — guarantees every subscribed server gets at least a status pip + player count
  - Powers the server-card grid (online/offline, players, uptime)

- **Option B — RCON read-only (rich event stream, opt-in per cluster):**
  - When the cluster admin grants TekOS an RCON read-only connection, the backend listens to the full server log stream
  - Pulls: chat messages, admin announcements, taming events, boss spawns, boss kills, player joins/leaves, tribe formations
  - Per-cluster opt-in — not every admin will share, but the ones who do enable the rich Server feed (boss spawns, admin announcements, etc.)
  - Powers the server-feed event stream below the cluster card

**Why both:** A is the universal baseline that works for everyone. B is the premium experience for clusters where admins partner with TekOS. The Server tab gracefully degrades — clusters with only A get status data; clusters with B get full event streams.

**Not building (for now):** Option C — server-side TekOS plugin. Higher fidelity but requires server admins to install custom mods. Defer until there's demand from a cluster.

**How to apply:** When the Server tab is implemented, build the A2S poller first as the universal layer. Add the RCON listener as a separate worker that activates per-cluster when credentials are configured. The cluster-configuration UI needs an "RCON connection (optional)" section where admins can paste credentials to unlock richer events.

**Reference:** Design preview at `static/feed-preview.html` shows the Server tab UI both layers populate.
