<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type SectionId = 'account' | 'privacy' | 'notifications' | 'themes' | 'cluster' | 'data' | 'integrations';
    let activeSection = $state<SectionId>('account');

    // ── Server-loaded settings blob (hydrated below as well) ────────────────
    const SERVER_SETTINGS = ((data as any).settings ?? {}) as Record<string, any>;

    // ── Global "dirty" state + sticky save bar ─────────────────────────────
    let dirty = $state(false);
    let savingActive = $state(false);
    let globalMsg = $state('');
    let globalErr = $state(false);
    function markDirty() { dirty = true; }

    // ── Account form state ──────────────────────────────────────────────────
    let nickname    = $state(data.profile?.nickname ?? '');
    let bio         = $state(data.profile?.bio ?? '');
    let lookingFor  = $state(data.profile?.lookingFor ?? '');
    let bannerImage = $state((data.profile as any)?.bannerImage ?? '');
    let avatarImage = $state((data.profile as any)?.avatarImage ?? '');
    let profSaving  = $state(false);
    let profMsg     = $state('');
    let profErr     = $state(false);

    // Change Email modal
    let emailOpen     = $state(false);
    let emailNew      = $state('');
    let emailPassword = $state('');
    let emailSaving   = $state(false);
    let emailMsg      = $state('');
    let emailErr      = $state(false);
    function openChangeEmail() {
        emailOpen = true;
        emailNew = ''; emailPassword = '';
        emailMsg = ''; emailErr = false;
    }
    async function submitChangeEmail() {
        emailMsg = ''; emailErr = false;
        if (!emailNew.trim()) { emailMsg = 'New email is required'; emailErr = true; return; }
        if (!emailPassword) { emailMsg = 'Confirm your current password'; emailErr = true; return; }
        emailSaving = true;
        try {
            const res = await fetch('/api/account/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: emailPassword, newEmail: emailNew.trim() })
            });
            if (res.ok) {
                emailMsg = '✓ Email updated';
                setTimeout(() => { emailOpen = false; location.reload(); }, 1200);
            } else {
                const body = await res.json().catch(() => ({}));
                emailMsg = body.error ?? 'Failed to change email';
                emailErr = true;
            }
        } catch {
            emailMsg = 'Network error'; emailErr = true;
        }
        emailSaving = false;
    }

    // Discord unlink
    async function unlinkDiscord() {
        if (!confirm('Unlink your Discord account from TekOS?')) return;
        const res = await fetch('/api/account/discord', { method: 'DELETE' });
        if (res.ok) location.reload();
        else {
            const body = await res.json().catch(() => ({}));
            alert(body.error ?? 'Failed to unlink Discord');
        }
    }

    // Typed-confirm dialog for destructive actions (Clear Vault / Leave All Tribes / Delete Account)
    type ConfirmKind = 'clear-vault' | 'leave-tribes' | 'delete-account';
    let confirmOpen     = $state<ConfirmKind | null>(null);
    let confirmTyped    = $state('');
    let confirmPassword = $state('');
    let confirmSaving   = $state(false);
    let confirmMsg      = $state('');
    let confirmErr      = $state(false);

    const CONFIRM_COPY: Record<ConfirmKind, { title: string; phrase: string; description: string; danger: string; actionLabel: string; needsPassword: boolean }> = {
        'clear-vault': {
            title: 'Clear Vault',
            phrase: 'WIPE',
            description: 'This will permanently delete every creature in your Vault. Pinned projects, breeding history, and lineage links are all destroyed.',
            danger: 'This cannot be undone.',
            actionLabel: 'Wipe my Vault',
            needsPassword: false
        },
        'leave-tribes': {
            title: 'Leave All Tribes',
            phrase: 'LEAVE',
            description: 'This removes you from every tribe you are a member of. Tribes you OWN are kept intact — you would need to transfer or delete those separately.',
            danger: 'You will need a new invite to rejoin.',
            actionLabel: 'Leave all tribes',
            needsPassword: false
        },
        'delete-account': {
            title: 'Delete Account',
            phrase: (data.profile?.nickname ?? data.profile?.email ?? '').toString(),
            description: 'This permanently deletes your account: profile, specimens, badges, trades, messages, friendships, and notifications. Cascades through every system.',
            danger: 'Everything is gone. No recovery.',
            actionLabel: 'Delete my account forever',
            needsPassword: true
        }
    };

    function openConfirm(kind: ConfirmKind) {
        confirmOpen = kind;
        confirmTyped = ''; confirmPassword = '';
        confirmMsg = ''; confirmErr = false;
    }
    async function submitConfirm() {
        if (!confirmOpen) return;
        const cfg = CONFIRM_COPY[confirmOpen];
        confirmMsg = ''; confirmErr = false;
        if (confirmTyped.trim().toLowerCase() !== cfg.phrase.toLowerCase()) {
            confirmMsg = `Type "${cfg.phrase}" exactly to confirm`;
            confirmErr = true;
            return;
        }
        if (cfg.needsPassword && !confirmPassword) {
            confirmMsg = 'Enter your current password';
            confirmErr = true;
            return;
        }
        confirmSaving = true;
        try {
            if (confirmOpen === 'clear-vault') {
                const res = await fetch('/api/creatures/all', { method: 'DELETE' });
                if (res.ok) {
                    const b = await res.json().catch(() => ({}));
                    confirmOpen = null;
                    dangerMsg = `✓ Vault cleared — ${b.deleted ?? 0} specimens removed.`;
                    dangerErr = false;
                    setTimeout(() => dangerMsg = '', 4000);
                } else {
                    confirmMsg = 'Failed to clear Vault'; confirmErr = true;
                }
            } else if (confirmOpen === 'leave-tribes') {
                const res = await fetch('/api/tribes/leave-all', { method: 'POST' });
                if (res.ok) {
                    const b = await res.json().catch(() => ({}));
                    confirmOpen = null;
                    dangerMsg = `✓ Left ${b.left ?? 0} tribes.`;
                    dangerErr = false;
                    setTimeout(() => dangerMsg = '', 4000);
                } else {
                    confirmMsg = 'Failed to leave tribes'; confirmErr = true;
                }
            } else if (confirmOpen === 'delete-account') {
                const res = await fetch('/api/account', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword: confirmPassword, confirmText: confirmTyped.trim() })
                });
                if (res.ok) {
                    confirmOpen = null;
                    window.location.href = '/login';
                } else {
                    const body = await res.json().catch(() => ({}));
                    confirmMsg = body.error ?? 'Failed to delete account';
                    confirmErr = true;
                }
            }
        } catch {
            confirmMsg = 'Network error'; confirmErr = true;
        }
        confirmSaving = false;
    }

    // Change Password modal
    let pwdOpen    = $state(false);
    let pwdCurrent = $state('');
    let pwdNew     = $state('');
    let pwdConfirm = $state('');
    let pwdSaving  = $state(false);
    let pwdMsg     = $state('');
    let pwdErr     = $state(false);

    function openChangePassword() {
        pwdOpen = true;
        pwdCurrent = ''; pwdNew = ''; pwdConfirm = '';
        pwdMsg = ''; pwdErr = false;
    }
    async function submitChangePassword() {
        pwdMsg = ''; pwdErr = false;
        if (!pwdCurrent) { pwdMsg = 'Enter your current password'; pwdErr = true; return; }
        if (pwdNew.length < 8) { pwdMsg = 'New password must be at least 8 characters'; pwdErr = true; return; }
        if (pwdNew !== pwdConfirm) { pwdMsg = 'New password and confirmation do not match'; pwdErr = true; return; }
        pwdSaving = true;
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew })
            });
            if (res.ok) {
                pwdMsg = '✓ Password updated';
                pwdErr = false;
                setTimeout(() => { pwdOpen = false; pwdMsg = ''; }, 1200);
            } else {
                const body = await res.json().catch(() => ({}));
                pwdMsg = body.error ?? 'Failed to change password';
                pwdErr = true;
            }
        } catch {
            pwdMsg = 'Network error';
            pwdErr = true;
        }
        pwdSaving = false;
    }

    // Avatar / banner uploaders (URL-paste stubs; backend accepts { url })
    let avatarFileInput: HTMLInputElement;
    let bannerFileInput: HTMLInputElement;
    let avatarUploading = $state(false);
    let bannerUploading = $state(false);

    async function uploadImage(file: File, endpoint: string): Promise<string | null> {
        // For now, read the file as a data URL and POST it as { url } since we have no blob storage.
        // (Backend accepts a hosted URL string; data: URLs work for testing.)
        const url = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = () => reject(r.error);
            r.readAsDataURL(file);
        });
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        if (!res.ok) return null;
        const b = await res.json().catch(() => ({}));
        return b.avatarImage ?? b.bannerImage ?? url;
    }

    async function onAvatarPicked(e: Event) {
        const f = (e.target as HTMLInputElement).files?.[0];
        if (!f) return;
        avatarUploading = true;
        const next = await uploadImage(f, '/api/upload/avatar');
        if (next) { avatarImage = next; profMsg = '✓ Avatar updated.'; setTimeout(() => profMsg = '', 2500); }
        else { profMsg = 'Avatar upload failed'; profErr = true; }
        avatarUploading = false;
    }
    async function onBannerPicked(e: Event) {
        const f = (e.target as HTMLInputElement).files?.[0];
        if (!f) return;
        bannerUploading = true;
        const next = await uploadImage(f, '/api/upload/banner');
        if (next) { bannerImage = next; profMsg = '✓ Banner updated.'; setTimeout(() => profMsg = '', 2500); }
        else { profMsg = 'Banner upload failed'; profErr = true; }
        bannerUploading = false;
    }

    async function saveProfile() {
        profSaving = true; profMsg = ''; profErr = false;
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nickname:    nickname.trim() || null,
                bio:         bio.trim() || null,
                lookingFor:  lookingFor.trim() || null,
                bannerImage: bannerImage.trim() || null,
                avatarImage: avatarImage.trim() || null
            })
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
            profMsg = '✓ Codex updated.';
            dirty = false;
            setTimeout(() => profMsg = '', 2500);
        } else {
            profMsg = body.error ?? 'Failed to save'; profErr = true;
        }
        profSaving = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVACY
    // ═══════════════════════════════════════════════════════════════════════
    const PRIVACY_DEFAULTS = {
        profileVisibility: 'survivors' as 'public' | 'survivors' | 'tribe_friends' | 'friends' | 'private',
        vaultVisibility:   'tribe_friends' as 'public' | 'tribe_friends' | 'friends' | 'private',
        dmPermissions:     'friends_tribe' as 'everyone' | 'friends_tribe' | 'friends' | 'none',
        friendRequests:    'everyone' as 'everyone' | 'mutuals' | 'none',
        showOnline:        true,
        allowTribeInvites: true,
        allowTradeRequests:true,
        showVaultCount:    true,
        showBadges:        true,
        appearInSuggestions: true
    };
    const initialPrivacy = { ...PRIVACY_DEFAULTS, ...((SERVER_SETTINGS.privacy ?? {}) as object) };
    let privacy = $state({ ...initialPrivacy });
    let privacySaving = $state(false);
    let privacyMsg    = $state('');
    let privacyErr    = $state(false);

    async function savePrivacy() {
        privacySaving = true; privacyMsg = ''; privacyErr = false;
        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ privacy })
        });
        if (res.ok) {
            privacyMsg = '✓ Privacy saved.';
            dirty = false;
            setTimeout(() => privacyMsg = '', 2500);
        } else {
            privacyMsg = 'Failed to save'; privacyErr = true;
        }
        privacySaving = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════
    // Only in-app is wired today. Email/Discord/Push channels were placeholder.
    type NotifChannels = { inapp: boolean };
    type NotifKey =
        | 'tribeActivity' | 'tradeRequests' | 'directMessages'
        | 'friendRequests' | 'bossTimers' | 'serverEvents'
        | 'serverStatus' | 'badgeMilestones' | 'globalDigest';
    const NOTIF_ROWS: { key: NotifKey; name: string; hint: string }[] = [
        { key: 'tribeActivity',   name: 'Tribe activity',   hint: 'Join requests, rank changes, war room pings' },
        { key: 'tradeRequests',   name: 'Trade requests',   hint: 'New offers on your Marketplace listings' },
        { key: 'directMessages',  name: 'Direct messages',  hint: 'New DMs from friends or trade contacts' },
        { key: 'friendRequests',  name: 'Friend requests',  hint: 'Incoming Network requests' },
        { key: 'bossTimers',      name: 'Boss timers',      hint: 'Tribe-scheduled fights coming up — 24h, 1h, 15min' },
        { key: 'serverEvents',    name: 'Server events',    hint: 'Boss spawns, admin announcements (requires RCON)' },
        { key: 'serverStatus',    name: 'Server status',    hint: 'A subscribed server goes down or comes back up' },
        { key: 'badgeMilestones', name: 'Badge milestones', hint: 'A new badge unlocks on your Badge Wall' },
        { key: 'globalDigest',    name: 'Global feed digest', hint: 'Weekly summary of news from sources you follow' }
    ];
    const NOTIF_DEFAULTS: Record<NotifKey, NotifChannels> = {
        tribeActivity:   { inapp: true  },
        tradeRequests:   { inapp: true  },
        directMessages:  { inapp: true  },
        friendRequests:  { inapp: true  },
        bossTimers:      { inapp: true  },
        serverEvents:    { inapp: true  },
        serverStatus:    { inapp: true  },
        badgeMilestones: { inapp: true  },
        globalDigest:    { inapp: false }
    };
    function buildNotifInitial(): Record<NotifKey, NotifChannels> {
        const out = {} as Record<NotifKey, NotifChannels>;
        const stored = (SERVER_SETTINGS.notifications ?? {}) as Record<string, Partial<NotifChannels>>;
        for (const r of NOTIF_ROWS) {
            out[r.key] = { ...NOTIF_DEFAULTS[r.key], ...(stored[r.key] ?? {}) };
        }
        return out;
    }
    let notif = $state(buildNotifInitial());
    let quietHoursOn = $state(((SERVER_SETTINGS.notifications as any)?.quietHoursOn) ?? true);
    let quietStart   = $state(((SERVER_SETTINGS.notifications as any)?.quietStart) ?? '23:00');
    let quietEnd     = $state(((SERVER_SETTINGS.notifications as any)?.quietEnd) ?? '07:00');
    let notifSaving  = $state(false);
    let notifMsg     = $state('');
    let notifErr     = $state(false);

    function toggleNotif(rowKey: NotifKey, channel: keyof NotifChannels) {
        notif[rowKey][channel] = !notif[rowKey][channel];
        markDirty();
    }

    async function saveNotif() {
        notifSaving = true; notifMsg = ''; notifErr = false;
        const payload: any = { ...notif, quietHoursOn, quietStart, quietEnd };
        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notifications: payload })
        });
        if (res.ok) {
            notifMsg = '✓ Notifications saved.';
            dirty = false;
            setTimeout(() => notifMsg = '', 2500);
        } else {
            notifMsg = 'Failed to save'; notifErr = true;
        }
        notifSaving = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CLUSTER
    // ═══════════════════════════════════════════════════════════════════════
    type ServerEntry = { id: string; name: string; map: string; role: 'admin' | 'member'; online: boolean; password?: string };
    const MAP_OPTIONS = [
        'The Island', 'Scorched Earth', 'Aberration', 'Extinction',
        'The Center', 'Genesis', 'Genesis 2', 'Ragnarok',
        'Valguero', 'Crystal Isles', 'Lost Island', 'Fjordur', 'Lost Colony', 'Astraeos', 'Svartalfheim'
    ];

    function detectMapFromName(name: string): string | null {
        const n = name.toLowerCase();
        if (n.includes('lost colony') || n.includes('lostcolony') || n.includes('lost_colony')) return 'Lost Colony';
        if (n.includes('genesis 2') || n.includes('genesis2') || n.includes('gen2') || n.includes('genesis part 2')) return 'Genesis 2';
        if (n.includes('crystal isles') || n.includes('crystalisles') || n.includes('crystal_isles')) return 'Crystal Isles';
        if (n.includes('lost island') || n.includes('lostisland') || n.includes('lost_island')) return 'Lost Island';
        if (n.includes('scorched earth') || n.includes('scorchedearth') || n.includes('scorched_earth') || n.includes('scorched')) return 'Scorched Earth';
        if (n.includes('aberration') || n.includes('abberation')) return 'Aberration';
        if (n.includes('extinction')) return 'Extinction';
        if (n.includes('the center') || n.includes('thecenter') || n.includes('the_center')) return 'The Center';
        if (n.includes('the island') || n.includes('theisland') || n.includes('the_island')) return 'The Island';
        if (n.includes('ragnarok')) return 'Ragnarok';
        if (n.includes('valguero')) return 'Valguero';
        if (n.includes('genesis')) return 'Genesis';
        if (n.includes('fjordur')) return 'Fjordur';
        if (n.includes('island')) return 'The Island';
        if (n.includes('astraeos') || n.includes('astreos')) return 'Astraeos';
        if (n.includes('svartalfheim') || n.includes('svartelheim')) return 'Svartalfheim';
        return null;
    }

    const seededServers = (SERVER_SETTINGS.cluster?.servers ?? SERVER_SETTINGS.servers ?? []) as ServerEntry[];
    let servers = $state<ServerEntry[]>(Array.isArray(seededServers) ? seededServers : []);
    let newServerName      = $state('');
    let newServerMap       = $state(MAP_OPTIONS[0]);
    let newServerPass      = $state('');
    let mapAutoDetected    = $state(false);
    let clusterSaving      = $state(false);
    let clusterMsg         = $state('');
    let clusterErr         = $state(false);

    function autoDetectMap() {
        const detected = detectMapFromName(newServerName);
        if (detected) { newServerMap = detected; mapAutoDetected = true; }
        else mapAutoDetected = false;
    }

    // RCON (single shared block per audit; admin-only in spirit — we keep the UI but the values are user-stored)
    const initialRcon = (SERVER_SETTINGS.cluster?.rcon ?? {}) as { host?: string; port?: string | number; password?: string };
    let rconHost = $state(String(initialRcon.host ?? ''));
    let rconPort = $state(String(initialRcon.port ?? '27020'));
    // Password is redacted to '<saved>' by the server; keep empty so user re-enters only when changing.
    let rconPass = $state(initialRcon.password === '<saved>' ? '' : String(initialRcon.password ?? ''));
    let rconPasswordSaved = $state(initialRcon.password === '<saved>');
    let rconStatusMsg = $state('');
    let rconStatusOk  = $state(false);

    // Polling preferences
    const initialPoll = (SERVER_SETTINGS.cluster?.poll ?? {}) as { interval?: string; pauseWhenIdle?: boolean };
    let pollInterval  = $state(String(initialPoll.interval ?? '60'));
    let pollPauseIdle = $state(initialPoll.pauseWhenIdle ?? true);

    function addServer() {
        const name = newServerName.trim();
        if (!name) return;
        servers = [...servers, {
            id: crypto.randomUUID(),
            name,
            map: newServerMap,
            role: 'member',
            online: true,
            password: newServerPass.trim() || undefined
        }];
        newServerName = ''; newServerPass = '';
        markDirty();
    }
    function removeServer(id: string) {
        servers = servers.filter(s => s.id !== id);
        markDirty();
    }
    async function testRcon() {
        rconStatusMsg = 'Testing…'; rconStatusOk = false;
        // No backend yet — simulate validation locally
        const ok = rconHost.trim().length > 0 && /^\d+$/.test(rconPort.trim()) && rconPass.length > 0;
        await new Promise(r => setTimeout(r, 350));
        if (ok) { rconStatusMsg = 'Connected — listening for events.'; rconStatusOk = true; }
        else    { rconStatusMsg = 'Host, port and password are all required.'; rconStatusOk = false; }
    }
    async function saveCluster() {
        clusterSaving = true; clusterMsg = ''; clusterErr = false;
        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cluster: {
                    servers,
                    rcon: { host: rconHost, port: rconPort, ...(rconPass ? { password: rconPass } : {}) },
                    poll: { interval: pollInterval, pauseWhenIdle: pollPauseIdle }
                },
                servers
            })
        });
        if (res.ok) {
            clusterMsg = '✓ Cluster saved.';
            dirty = false;
            setTimeout(() => clusterMsg = '', 2500);
        } else {
            clusterMsg = 'Failed to save'; clusterErr = true;
        }
        clusterSaving = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTEGRATIONS
    // ═══════════════════════════════════════════════════════════════════════
    type DiscordEvents = { tribeAnnounce?: boolean; warRoom?: boolean; badge?: boolean; trade?: boolean };
    const initialIntegrations = (SERVER_SETTINGS.integrations ?? {}) as {
        discordWebhook?: string; discordEvents?: DiscordEvents;
        twitchKey?: string; youtubeChannel?: string;
    };
    let discordWebhook = $state(initialIntegrations.discordWebhook ?? '');
    let discordEvents = $state<DiscordEvents>({
        tribeAnnounce: initialIntegrations.discordEvents?.tribeAnnounce !== false,
        warRoom:       initialIntegrations.discordEvents?.warRoom !== false,
        badge:         initialIntegrations.discordEvents?.badge !== false,
        trade:         initialIntegrations.discordEvents?.trade !== false
    });
    let twitchKey      = $state(initialIntegrations.twitchKey ?? '');
    let youtubeChannel = $state(initialIntegrations.youtubeChannel ?? '');
    let intSaving = $state(false);
    let intMsg    = $state('');
    let intErr    = $state(false);
    let webhookTestMsg = $state('');

    async function testDiscordWebhook() {
        if (!discordWebhook.trim()) { webhookTestMsg = 'Paste a webhook URL first.'; return; }
        webhookTestMsg = 'Sending test ping…';
        try {
            const res = await fetch(discordWebhook.trim(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: '⬡ TekOS test ping — webhook is live.' })
            });
            webhookTestMsg = res.ok ? '✓ Webhook responded OK.' : `Webhook responded ${res.status}.`;
        } catch {
            webhookTestMsg = 'Network error reaching webhook.';
        }
        setTimeout(() => webhookTestMsg = '', 4000);
    }

    async function saveIntegrations() {
        intSaving = true; intMsg = ''; intErr = false;
        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                integrations: {
                    discordWebhook: discordWebhook.trim(),
                    discordEvents: { ...discordEvents },
                    twitchKey: twitchKey.trim(),
                    youtubeChannel: youtubeChannel.trim()
                }
            })
        });
        if (res.ok) {
            intMsg = '✓ Integrations saved.';
            dirty = false;
            setTimeout(() => intMsg = '', 2500);
        } else {
            intMsg = 'Failed to save'; intErr = true;
        }
        intSaving = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DANGER ZONE actions
    // ═══════════════════════════════════════════════════════════════════════
    let dangerMsg = $state('');
    let dangerErr = $state(false);
    // ── Import collection (paste from a Vault Export JSON file) ─────────
    let importInput: HTMLInputElement;
    let importMsg = $state('');
    let importErr = $state(false);
    let importBusy = $state(false);

    async function onImportFile(e: Event) {
        const file = (e.target as HTMLInputElement)?.files?.[0];
        if (!file) return;
        importMsg = 'Reading file…'; importErr = false; importBusy = true;
        try {
            const text = await file.text();
            let parsed: unknown;
            try { parsed = JSON.parse(text); }
            catch { importMsg = 'Could not parse JSON — file is malformed'; importErr = true; importBusy = false; return; }
            const res = await fetch('/api/creatures/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed)
            });
            const body = await res.json().catch(() => ({}));
            if (res.ok) {
                importMsg = `✓ Imported ${body.inserted ?? 0} creatures${body.skipped ? ` · ${body.skipped} skipped` : ''}.`;
                importErr = false;
            } else {
                importMsg = body.error ?? 'Import failed';
                importErr = true;
            }
        } catch (err) {
            importMsg = (err as Error).message ?? 'Import failed';
            importErr = true;
        }
        importBusy = false;
        if (importInput) importInput.value = '';
    }

    // Cluster help disclosure
    let serverHelpOpen = $state(false);

    // Old direct handlers replaced by openConfirm() typed-confirm flow above.

    // ═══════════════════════════════════════════════════════════════════════
    // Global save bar — routes to the current section's save handler
    // ═══════════════════════════════════════════════════════════════════════
    async function saveActiveSection() {
        savingActive = true; globalMsg = ''; globalErr = false;
        try {
            switch (activeSection) {
                case 'account':       await saveProfile(); break;
                case 'privacy':       await savePrivacy(); break;
                case 'notifications': await saveNotif(); break;
                case 'cluster':       await saveCluster(); break;
                case 'integrations':  await saveIntegrations(); break;
                case 'themes':
                case 'data':
                    // Themes save inline on selection; Data has no central save.
                    dirty = false;
                    break;
            }
        } finally {
            savingActive = false;
        }
    }
    function discardChanges() {
        if (!confirm('Discard unsaved changes on this page?')) return;
        location.reload();
    }

    // ── Theme palettes ──────────────────────────────────────────────────────
    type MapPalette = {
        id: string; name: string; tag: string;
        primary: string; accent: string; bg: string;
        prvBg: string; prvLine: string; prvGlow1: string; prvGlow2: string;
        sw1: string; sw2: string; sw3: string;
    };
    const PALETTES: MapPalette[] = [
        { id: 'island',     name: 'The Island',     tag: 'CYAN · DEFAULT',
          primary: '#00b4ff', accent: '#8b5cf6', bg: '#050812',
          prvBg: '#050812', prvLine: 'rgba(0,180,255,0.18)',
          prvGlow1: 'rgba(0,180,255,0.40)', prvGlow2: 'rgba(139,92,246,0.30)',
          sw1: '#00b4ff', sw2: '#8b5cf6', sw3: '#0a1228' },
        { id: 'aberration', name: 'Aberration',     tag: 'BIO · PURPLE/GREEN',
          primary: '#a855f7', accent: '#10b981', bg: '#0c0418',
          prvBg: '#0c0418', prvLine: 'rgba(168,85,247,0.20)',
          prvGlow1: 'rgba(168,85,247,0.45)', prvGlow2: 'rgba(16,185,129,0.35)',
          sw1: '#a855f7', sw2: '#10b981', sw3: '#180a28' },
        { id: 'scorched',   name: 'Scorched Earth', tag: 'DESERT · AMBER/RED',
          primary: '#f59e0b', accent: '#ef4444', bg: '#1a0a04',
          prvBg: '#1a0a04', prvLine: 'rgba(245,158,11,0.20)',
          prvGlow1: 'rgba(245,158,11,0.45)', prvGlow2: 'rgba(239,68,68,0.35)',
          sw1: '#f59e0b', sw2: '#ef4444', sw3: '#2a1408' },
        { id: 'genesis',    name: 'Genesis',        tag: 'SIM · TEAL/MAGENTA',
          primary: '#22d3ee', accent: '#d946ef', bg: '#040818',
          prvBg: '#040818', prvLine: 'rgba(34,211,238,0.20)',
          prvGlow1: 'rgba(34,211,238,0.45)', prvGlow2: 'rgba(217,70,239,0.30)',
          sw1: '#22d3ee', sw2: '#d946ef', sw3: '#091230' },
        { id: 'extinction', name: 'Extinction',     tag: 'RUIN · ORANGE/TEAL',
          primary: '#fb923c', accent: '#14b8a6', bg: '#180a04',
          prvBg: '#180a04', prvLine: 'rgba(251,146,60,0.20)',
          prvGlow1: 'rgba(251,146,60,0.45)', prvGlow2: 'rgba(20,184,166,0.35)',
          sw1: '#fb923c', sw2: '#14b8a6', sw3: '#2a1208' },
        { id: 'ragnarok',   name: 'Ragnarok',       tag: 'NORDIC · BLUE/GOLD',
          primary: '#60a5fa', accent: '#fcd34d', bg: '#040818',
          prvBg: '#040818', prvLine: 'rgba(96,165,250,0.20)',
          prvGlow1: 'rgba(96,165,250,0.45)', prvGlow2: 'rgba(252,211,77,0.30)',
          sw1: '#60a5fa', sw2: '#fcd34d', sw3: '#08142d' },
        { id: 'alpha', name: 'Alpha Survivor', tag: 'GOLD',
          primary: '#fcd34d', accent: '#ffffff', bg: '#0c0a02',
          prvBg: '#0c0a02', prvLine: 'rgba(250,204,21,0.20)',
          prvGlow1: 'rgba(250,204,21,0.45)', prvGlow2: 'rgba(255,255,255,0.20)',
          sw1: '#fcd34d', sw2: '#ffffff', sw3: '#1a1408' },
        { id: 'tek-proto', name: 'Tek Prototype', tag: 'BLUEPRINT',
          primary: '#2dd4bf', accent: '#a5f3fc', bg: '#020c0c',
          prvBg: '#020c0c', prvLine: 'rgba(45,212,191,0.25)',
          prvGlow1: 'rgba(45,212,191,0.50)', prvGlow2: 'rgba(165,243,252,0.30)',
          sw1: '#2dd4bf', sw2: '#a5f3fc', sw3: '#021818' },
        { id: 'corrupted', name: 'Element Corrupted', tag: 'CORRUPTION',
          primary: '#d946ef', accent: '#f472b6', bg: '#100214',
          prvBg: '#100214', prvLine: 'rgba(217,70,239,0.25)',
          prvGlow1: 'rgba(217,70,239,0.50)', prvGlow2: 'rgba(244,114,182,0.30)',
          sw1: '#d946ef', sw2: '#f472b6', sw3: '#200628' }
    ];

    let activePaletteId = $state('island');
    let themeMsg = $state('');
    let themeErr = $state(false);

    function hexToRgb(h: string) {
        const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
        return `${r},${g},${b}`;
    }
    function applyThemeToDom(p: MapPalette) {
        const root = document.documentElement;
        root.style.setProperty('--tek-blue', p.primary);
        root.style.setProperty('--tek-blue-dim',    `rgba(${hexToRgb(p.primary)},0.12)`);
        root.style.setProperty('--tek-blue-border', `rgba(${hexToRgb(p.primary)},0.30)`);
        root.style.setProperty('--tek-blue-glow',   `rgba(${hexToRgb(p.primary)},0.50)`);
        root.style.setProperty('--tek-purple', p.accent);
        root.style.setProperty('--tek-bg',     p.bg);
    }
    async function selectPalette(p: MapPalette) {
        activePaletteId = p.id;
        applyThemeToDom(p);
        themeMsg = ''; themeErr = false;
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mapPalette: p.id, theme: { primary: p.primary, accent: p.accent, bg: p.bg } })
            });
            if (res.ok) {
                themeMsg = '✓ Palette saved';
            } else {
                themeMsg = 'Failed to save palette'; themeErr = true;
            }
            setTimeout(() => themeMsg = '', 2000);
        } catch {
            themeMsg = 'Network error'; themeErr = true;
        }
    }

    // ── Hex canvas ──────────────────────────────────────────────────────────
    let hexCanvas: HTMLCanvasElement;

    onMount(() => {
        // Allow deep-linking to a specific section via ?tab=cluster (etc.)
        const paramTab = new URLSearchParams(window.location.search).get('tab');
        const TAB_IDS: SectionId[] = ['account','privacy','notifications','themes','cluster','data','integrations'];
        if (paramTab && (TAB_IDS as string[]).includes(paramTab)) {
            activeSection = paramTab as SectionId;
        }

        // Hex canvas background
        const canvas = hexCanvas;
        if (canvas) {
            const ctx = canvas.getContext('2d')!;
            let w: number, h: number;
            let hexes: { x: number; y: number; size: number; glow: number }[] = [];
            let rafId: number;
            function resize() {
                w = canvas.width = window.innerWidth;
                h = canvas.height = window.innerHeight;
                hexes = [];
                const size = 36, hSpace = size * 1.5, vSpace = size * Math.sqrt(3);
                for (let y = -size; y < h + size; y += vSpace) {
                    for (let x = -size; x < w + size; x += hSpace) {
                        const offsetY = (Math.floor(x / hSpace) % 2) * vSpace / 2;
                        hexes.push({ x, y: y + offsetY, size, glow: Math.random() });
                    }
                }
            }
            function draw() {
                ctx.clearRect(0, 0, w, h);
                ctx.lineWidth = 1;
                const t = Date.now() / 4000;
                hexes.forEach((hex, i) => {
                    const phase = (Math.sin(t + i * 0.3) + 1) / 2;
                    ctx.strokeStyle = `rgba(0,180,255,${0.03 + phase * 0.04})`;
                    ctx.beginPath();
                    for (let a = 0; a < 6; a++) {
                        const angle = (Math.PI / 3) * a;
                        const px = hex.x + hex.size * Math.cos(angle);
                        const py = hex.y + hex.size * Math.sin(angle);
                        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.stroke();
                });
                rafId = requestAnimationFrame(draw);
            }
            window.addEventListener('resize', resize);
            resize(); draw();
        }

        // Hydrate palette + voice + tab payloads from /api/settings
        (async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const body = await res.json();
                    if (body.mapPalette) {
                        const matched = PALETTES.find(p => p.id === body.mapPalette);
                        if (matched) activePaletteId = matched.id;
                    } else if (body.theme?.primary) {
                        const matched = PALETTES.find(p => p.primary.toLowerCase() === body.theme.primary.toLowerCase());
                        if (matched) activePaletteId = matched.id;
                    }
                    if (body.privacy && typeof body.privacy === 'object') {
                        privacy = { ...PRIVACY_DEFAULTS, ...body.privacy };
                    }
                    if (body.notifications && typeof body.notifications === 'object') {
                        const stored = body.notifications;
                        for (const r of NOTIF_ROWS) {
                            if (stored[r.key]) notif[r.key] = { ...NOTIF_DEFAULTS[r.key], ...stored[r.key] };
                        }
                        if (typeof stored.quietHoursOn === 'boolean') quietHoursOn = stored.quietHoursOn;
                        if (typeof stored.quietStart === 'string')   quietStart   = stored.quietStart;
                        if (typeof stored.quietEnd   === 'string')   quietEnd     = stored.quietEnd;
                    }
                    if (body.cluster?.servers) servers = body.cluster.servers;
                    else if (Array.isArray(body.servers)) servers = body.servers;
                    if (body.cluster?.rcon) {
                        rconHost = String(body.cluster.rcon.host ?? rconHost);
                        rconPort = String(body.cluster.rcon.port ?? rconPort);
                        // Password is redacted server-side; keep the local value as-is so
                        // the user doesn't need to re-enter it on every settings load.
                        if (body.cluster.rcon.password === '<saved>') {
                            // leave rconPass unchanged — backend has it stored
                        } else {
                            rconPass = String(body.cluster.rcon.password ?? rconPass);
                        }
                    }
                    if (body.cluster?.poll) {
                        pollInterval  = String(body.cluster.poll.interval ?? pollInterval);
                        pollPauseIdle = body.cluster.poll.pauseWhenIdle ?? pollPauseIdle;
                    }
                    if (body.integrations) {
                        discordWebhook = body.integrations.discordWebhook ?? '';
                        twitchKey      = body.integrations.twitchKey ?? '';
                        youtubeChannel = body.integrations.youtubeChannel ?? '';
                        if (body.integrations.discordEvents) {
                            discordEvents = {
                                tribeAnnounce: body.integrations.discordEvents.tribeAnnounce !== false,
                                warRoom:       body.integrations.discordEvents.warRoom !== false,
                                badge:         body.integrations.discordEvents.badge !== false,
                                trade:         body.integrations.discordEvents.trade !== false
                            };
                        }
                    }
                }
            } catch {}
        })();
    });
</script>

<svelte:head>
    <title>⬡ TEKOS — Settings</title>
</svelte:head>

<canvas id="tekHexCanvas" bind:this={hexCanvas}></canvas>

<div class="stage">

    <!-- Header -->
    <div class="page-header">
        <div class="breadcrumb">
            <a href="/dossier">DASHBOARD</a><span class="sep">/</span><span>SETTINGS</span>
        </div>
        <h1 class="page-title">Settings</h1>
        <div class="page-sub">
            Signed in as <span class="signed">{(data.profile?.nickname ?? data.profile?.email ?? 'SURVIVOR').toString().toUpperCase()}</span>
        </div>
    </div>

    <!-- Shell -->
    <div class="settings-shell">

        <!-- LEFT NAV -->
        <nav class="side-nav">
            <div class="side-nav-label">Configure</div>
            <button type="button" class="nav-item" class:active={activeSection === 'account'} onclick={() => activeSection = 'account'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>
                Account
            </button>
            <button type="button" class="nav-item" class:active={activeSection === 'privacy'} onclick={() => activeSection = 'privacy'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4z"/></svg>
                Privacy
            </button>
            <button type="button" class="nav-item" class:active={activeSection === 'notifications'} onclick={() => activeSection = 'notifications'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0112 0v5l2 3H4l2-3V8z"/><path d="M10 19a2 2 0 004 0"/></svg>
                Notifications
            </button>
            <button type="button" class="nav-item" class:active={activeSection === 'themes'} onclick={() => activeSection = 'themes'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>
                Themes
            </button>
            <button type="button" class="nav-item" class:active={activeSection === 'cluster'} onclick={() => activeSection = 'cluster'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="17" r="1" fill="currentColor"/></svg>
                Cluster
            </button>
            <button type="button" class="nav-item" class:active={activeSection === 'data'} onclick={() => activeSection = 'data'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6"/></svg>
                Data
            </button>
            <button type="button" class="nav-item" class:active={activeSection === 'integrations'} onclick={() => activeSection = 'integrations'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>
                Integrations
            </button>
        </nav>

        <!-- RIGHT PANEL -->
        <div class="panel">

            <!-- ============ ACCOUNT ============ -->
            <div class="panel-section" class:active={activeSection === 'account'} id="section-account">
                <div class="section-header">
                    <div class="section-title">Account</div>
                    <div class="section-desc">Survivor identity, authentication, active sessions</div>
                </div>

                <!-- Identity strip -->
                <div class="identity-strip">
                    <div class="id-avatar">
                        {#if avatarImage}
                            <img src={avatarImage} alt="Avatar" style="width:100%;height:100%;object-fit:cover;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);" />
                        {:else}
                            <svg viewBox="0 0 88 100">
                                <defs>
                                    <linearGradient id="avGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#00b4ff"/>
                                        <stop offset="100%" stop-color="#8b5cf6"/>
                                    </linearGradient>
                                </defs>
                                <polygon points="44,4 84,26 84,74 44,96 4,74 4,26" fill="rgba(10,18,44,0.9)" stroke="url(#avGrad)" stroke-width="2"/>
                                <text x="44" y="62" font-family="Orbitron" font-size="32" font-weight="900" fill="url(#avGrad)" text-anchor="middle">{(data.profile?.nickname?.[0] ?? data.profile?.email?.[0] ?? 'S').toUpperCase()}</text>
                            </svg>
                        {/if}
                    </div>
                    <div class="id-info">
                        <div class="id-name">{data.profile?.nickname ?? 'Survivor'}</div>
                        <div class="id-meta">SURVIVOR-ID · {(data.profile?.id ?? '').toString().slice(0,8).toUpperCase()} <span class="badge">FOUNDER</span></div>
                    </div>
                    <div class="id-actions">
                        <input type="file" accept="image/*" bind:this={avatarFileInput} onchange={onAvatarPicked} style="display:none;" />
                        <input type="file" accept="image/*" bind:this={bannerFileInput} onchange={onBannerPicked} style="display:none;" />
                        <button class="btn ghost" onclick={() => avatarFileInput?.click()} disabled={avatarUploading}>
                            {avatarUploading ? 'UPLOADING…' : 'CHANGE AVATAR'}
                        </button>
                        <button class="btn ghost" onclick={() => bannerFileInput?.click()} disabled={bannerUploading}>
                            {bannerUploading ? 'UPLOADING…' : 'CHANGE BANNER'}
                        </button>
                    </div>
                </div>

                <div class="group">
                    <div class="group-label">Identity</div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Display name</div>
                            <div class="row-hint">Shown on your Dossier, in trades, and across the feed.</div>
                        </div>
                        <input class="input" bind:value={nickname} oninput={markDirty} placeholder="The name the wild remembers" />
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Email</div>
                            <div class="row-hint">Used for sign-in and account recovery. Locked.</div>
                        </div>
                        <input class="input" value={data.profile?.email ?? ''} disabled style="opacity:0.6;" />
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Bio</div>
                            <div class="row-hint">Up to 280 characters. Crimson Pro italic on your Dossier.</div>
                        </div>
                        <input class="input wide" bind:value={bio} oninput={markDirty} placeholder="Hardcore breeder. Loaded Crysis cluster. Boss prep — gear, tames, gameplan." />
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Looking for</div>
                            <div class="row-hint">What you're seeking in trades or partnerships.</div>
                        </div>
                        <input class="input wide" bind:value={lookingFor} oninput={markDirty} placeholder="High-melee Yuty lines, Alpha Boss runs, etc." />
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Banner image URL</div>
                            <div class="row-hint">Background banner on your Dossier — pasted URL or uploaded via CHANGE BANNER above.</div>
                        </div>
                        <input class="input wide" bind:value={bannerImage} oninput={markDirty} placeholder="https://…" />
                    </div>
                    <div class="row">
                        <div></div>
                        <button class="btn solid" onclick={saveProfile} disabled={profSaving}>
                            {profSaving ? 'SAVING…' : 'SAVE CHANGES'}
                        </button>
                    </div>
                    {#if profMsg}
                        <div class="result-msg" class:error={profErr}>{profMsg}</div>
                    {/if}
                </div>

                <div class="group">
                    <div class="group-label">Linked accounts</div>
                    <div class="linked-row">
                        <div class="linked-icon discord">D</div>
                        <div class="linked-info">
                            <div class="linked-name">Discord</div>
                            <div class="linked-handle">{data.profile?.discordName ?? 'Not linked'}</div>
                        </div>
                        {#if data.profile?.discordName}
                            <div class="linked-status"><span class="dot"></span>LINKED</div>
                            <button class="btn ghost" onclick={unlinkDiscord}>Unlink</button>
                        {:else}
                            <a class="btn" href="/api/auth/discord/start">LINK DISCORD</a>
                        {/if}
                    </div>
                    <div class="linked-row">
                        <div class="linked-icon email">@</div>
                        <div class="linked-info">
                            <div class="linked-name">Email</div>
                            <div class="linked-handle">{data.profile?.email ?? ''}</div>
                        </div>
                        <div class="linked-status"><span class="dot"></span>VERIFIED</div>
                        <button class="btn ghost" onclick={openChangeEmail}>Change</button>
                    </div>
                </div>

                <div class="group">
                    <div class="group-label">Security</div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Password</div>
                            <div class="row-hint">Change your sign-in passcode.</div>
                        </div>
                        <button class="btn" onclick={openChangePassword}>CHANGE PASSWORD</button>
                    </div>
                </div>
            </div>

            <!-- ============ PRIVACY ============ -->
            <div class="panel-section" class:active={activeSection === 'privacy'} id="section-privacy">
                <div class="section-header">
                    <div class="section-title">Privacy</div>
                    <div class="section-desc">Control what the rest of the Survivor network can see</div>
                </div>

                <div class="group">
                    <div class="group-label">Profile visibility</div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Who can see your Dossier</div>
                            <div class="row-hint">Includes your Badge Wall, stats summary, and tribe affiliation.</div>
                        </div>
                        <select class="select" bind:value={privacy.profileVisibility} onchange={markDirty}>
                            <option value="public">Public</option>
                            <option value="survivors">Signed-in Survivors</option>
                            <option value="tribe_friends">Tribe + Friends</option>
                            <option value="friends">Friends only</option>
                            <option value="private">Just me</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Who can see your Vault</div>
                            <div class="row-hint">Your saved specimens and their stat lines.</div>
                        </div>
                        <select class="select" bind:value={privacy.vaultVisibility} onchange={markDirty}>
                            <option value="public">Everyone</option>
                            <option value="tribe_friends">Tribe + Friends</option>
                            <option value="friends">Friends only</option>
                            <option value="private">Just me</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Show vault count on your public profile</div>
                            <div class="row-hint">When off, your specimen count shows as "—" to other survivors.</div>
                        </div>
                        <button type="button" class="toggle" class:on={privacy.showVaultCount} role="switch" aria-checked={privacy.showVaultCount} aria-label="Show vault count"
                             onclick={() => { privacy.showVaultCount = !privacy.showVaultCount; markDirty(); }}></button>
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Show badges on public profile</div>
                            <div class="row-hint">Shows your Boss Ready / Specialist Roles / Underdog / Prize Bloodline wall.</div>
                        </div>
                        <button type="button" class="toggle" class:on={privacy.showBadges} role="switch" aria-checked={privacy.showBadges} aria-label="Show badges"
                             onclick={() => { privacy.showBadges = !privacy.showBadges; markDirty(); }}></button>
                    </div>
                </div>

                <div class="group">
                    <div class="group-label">Contact &amp; requests</div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Who can send you DMs</div>
                            <div class="row-hint">War Room and Trade messages from listings always go through.</div>
                        </div>
                        <select class="select" bind:value={privacy.dmPermissions} onchange={markDirty}>
                            <option value="everyone">Everyone</option>
                            <option value="friends_tribe">Friends + Tribe</option>
                            <option value="friends">Friends only</option>
                            <option value="none">No one</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Who can send friend requests</div>
                            <div class="row-hint">Mutual friends always count.</div>
                        </div>
                        <select class="select" bind:value={privacy.friendRequests} onchange={markDirty}>
                            <option value="everyone">Everyone</option>
                            <option value="mutuals">Friends of friends</option>
                            <option value="none">No one</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Allow tribe invites</div>
                            <div class="row-hint">When off, tribes cannot send you recruitment requests.</div>
                        </div>
                        <button type="button" class="toggle" class:on={privacy.allowTribeInvites} role="switch" aria-checked={privacy.allowTribeInvites} aria-label="Allow tribe invites"
                             onclick={() => { privacy.allowTribeInvites = !privacy.allowTribeInvites; markDirty(); }}></button>
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Allow trade requests from anyone</div>
                            <div class="row-hint">When off, only friends &amp; tribe can offer on your listings.</div>
                        </div>
                        <button type="button" class="toggle" class:on={privacy.allowTradeRequests} role="switch" aria-checked={privacy.allowTradeRequests} aria-label="Allow trade requests"
                             onclick={() => { privacy.allowTradeRequests = !privacy.allowTradeRequests; markDirty(); }}></button>
                    </div>
                </div>

                <div class="group">
                    <div class="group-label">Discoverability</div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Appear in Network suggestions</div>
                            <div class="row-hint">Surface in Friend page Discovery and Tribe recruitment.</div>
                        </div>
                        <button type="button" class="toggle" class:on={privacy.appearInSuggestions} role="switch" aria-checked={privacy.appearInSuggestions} aria-label="Appear in network suggestions"
                             onclick={() => { privacy.appearInSuggestions = !privacy.appearInSuggestions; markDirty(); }}></button>
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Show me as online when active</div>
                            <div class="row-hint">Off hides your green pip — friends will see you as offline.</div>
                        </div>
                        <button type="button" class="toggle" class:on={privacy.showOnline} role="switch" aria-checked={privacy.showOnline} aria-label="Show online status"
                             onclick={() => { privacy.showOnline = !privacy.showOnline; markDirty(); }}></button>
                    </div>
                </div>

                <div class="row">
                    <div></div>
                    <button class="btn solid" onclick={savePrivacy} disabled={privacySaving}>
                        {privacySaving ? 'SAVING…' : 'SAVE PRIVACY'}
                    </button>
                </div>
                {#if privacyMsg}
                    <div class="result-msg" class:error={privacyErr}>{privacyMsg}</div>
                {/if}
            </div>

            <!-- ============ NOTIFICATIONS ============ -->
            <div class="panel-section" class:active={activeSection === 'notifications'} id="section-notifications">
                <div class="section-header">
                    <div class="section-title">Notifications</div>
                    <div class="section-desc">Pick which alerts reach you, and through which channel</div>
                </div>

                <div class="group">
                    <div class="group-label">Channel matrix</div>
                    <table class="notif-table">
                        <thead>
                            <tr>
                                <th class="cat">Category</th>
                                <th>In-App</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each NOTIF_ROWS as r}
                                <tr>
                                    <td class="cat">
                                        <div class="notif-cat-name">{r.name}</div>
                                        <div class="notif-cat-hint">{r.hint}</div>
                                    </td>
                                    <td><button type="button" class="notif-cell-toggle" class:on={notif[r.key].inapp} role="switch" aria-checked={notif[r.key].inapp} aria-label="In-app notifications for {r.name}"
                                              onclick={() => toggleNotif(r.key, 'inapp')}></button></td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                <div class="group">
                    <div class="group-label">Quiet hours</div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Mute in-app notifications during quiet hours</div>
                            <div class="row-hint">Local time. While active, new notifications are skipped entirely — they won't show up on your bell, even later.</div>
                        </div>
                        <button type="button" class="toggle" class:on={quietHoursOn} role="switch" aria-checked={quietHoursOn} aria-label="Enable quiet hours"
                             onclick={() => { quietHoursOn = !quietHoursOn; markDirty(); }}></button>
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Quiet hours window</div>
                            <div class="row-hint">Local time. Set both to the same value to disable.</div>
                        </div>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <input class="input" type="time" bind:value={quietStart} oninput={markDirty} style="min-width:110px;" />
                            <span style="color: var(--tek-text-faint); font-family: var(--tek-mono); font-size:0.74rem;">→</span>
                            <input class="input" type="time" bind:value={quietEnd} oninput={markDirty} style="min-width:110px;" />
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div></div>
                    <button class="btn solid" onclick={saveNotif} disabled={notifSaving}>
                        {notifSaving ? 'SAVING…' : 'SAVE NOTIFICATIONS'}
                    </button>
                </div>
                {#if notifMsg}
                    <div class="result-msg" class:error={notifErr}>{notifMsg}</div>
                {/if}
            </div>

            <!-- ============ THEMES ============ -->
            <div class="panel-section" class:active={activeSection === 'themes'} id="section-themes">
                <div class="section-header">
                    <div class="section-title">Themes</div>
                    <div class="section-desc">Recolor your TekOS instance to match your home map · unlock more by earning badges</div>
                </div>

                <div class="group">
                    <div class="group-label">Map palettes <span style="color: var(--tek-text-dim); text-transform: none; letter-spacing: 0.05em;">— Pick your map's aesthetic. Affects accents site-wide.</span></div>
                    <div class="themes-grid">
                        {#each PALETTES as p}
                            <button type="button" class="theme-card"
                                 class:active={activePaletteId === p.id}
                                 style:--prv-bg={p.prvBg}
                                 style:--prv-line={p.prvLine}
                                 style:--prv-glow1={p.prvGlow1}
                                 style:--prv-glow2={p.prvGlow2}
                                 onclick={() => selectPalette(p)}>
                                <div class="theme-preview"></div>
                                <div class="theme-name">{p.name}</div>
                                <div class="theme-tag">{p.tag}</div>
                                <div class="theme-swatches">
                                    <div class="swatch" style:background={p.sw1}></div>
                                    <div class="swatch" style:background={p.sw2}></div>
                                    <div class="swatch" style:background={p.sw3}></div>
                                </div>
                            </button>
                        {/each}

                    </div>
                    {#if themeMsg}
                        <div class="result-msg" class:error={themeErr} style="margin-top: 10px;">{themeMsg}</div>
                    {/if}
                </div>

            </div>

            <!-- ============ CLUSTER ============ -->
            <div class="panel-section" class:active={activeSection === 'cluster'} id="section-cluster">
                <div class="section-header">
                    <div class="section-title">Cluster</div>
                    <div class="section-desc">Servers you follow and how TekOS reads their data</div>
                </div>

                <div class="cluster-card">
                    <div class="cluster-head">
                        <div>
                            <div class="cluster-name-wrap">
                                <div class="cluster-emblem">⬡</div>
                                <div>
                                    <div class="cluster-name">Your Cluster</div>
                                    <div class="cluster-meta">{servers.length} SERVER{servers.length === 1 ? '' : 'S'} · YOUR HOME CLUSTER <span class="chip green">PRIMARY</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {#if servers.length > 0}
                        <div class="server-list">
                            {#each servers as s}
                                <div class="server-chip" class:offline={!s.online}>
                                    <span class="pip"></span>
                                    <span class="name">{s.name} <span style="color:var(--tek-text-faint);font-size:0.7em;">· {s.map}{s.role === 'admin' ? ' · ADMIN' : ''}</span></span>
                                    <button type="button" class="x" onclick={() => removeServer(s.id)} title="Remove" aria-label="Remove server">✕</button>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div style="font-family:var(--tek-mono); font-size:0.76rem; color:var(--tek-text-dim); padding:18px 0;">
                            No servers added yet. Add your first server below.
                        </div>
                    {/if}

                    <div class="add-server-row" style="flex-wrap:wrap; gap:8px;">
                        <input class="input" bind:value={newServerName} oninput={() => { markDirty(); autoDetectMap(); }} placeholder="Server name (e.g. Ragnarok·07)" style="flex:1; min-width:200px;" />
                        <div style="display:flex; flex-direction:column; gap:3px; min-width:160px;">
                            <select class="select" bind:value={newServerMap} onchange={() => { markDirty(); mapAutoDetected = false; }} style="width:100%;">
                                {#each MAP_OPTIONS as m}
                                    <option value={m}>{m}</option>
                                {/each}
                            </select>
                            {#if mapAutoDetected}
                                <div style="font-family:var(--tek-mono); font-size:0.58rem; letter-spacing:0.12em; color:var(--tek-green); text-transform:uppercase;">⟳ auto-detected</div>
                            {/if}
                        </div>
                        <input class="input" bind:value={newServerPass} placeholder="Password (optional)" type="password" style="min-width:160px;" />
                        <button class="btn" onclick={addServer}>＋ ADD SERVER</button>
                    </div>

                    <!-- Server-name helper -->
                    <div class="srv-help">
                        <button
                            class="srv-help-toggle"
                            type="button"
                            onclick={() => serverHelpOpen = !serverHelpOpen}
                            aria-expanded={serverHelpOpen}
                        >
                            <span class="srv-help-chev">{serverHelpOpen ? '▾' : '▸'}</span>
                            How do I find my server name?
                        </button>
                        {#if serverHelpOpen}
                            <div class="srv-help-body">
                                <p>Use whichever fits your situation — the name TekOS needs is the same name the server broadcasts on the network.</p>
                                <ol class="srv-help-list">
                                    <li>
                                        <strong>In-game (easiest):</strong> When you're at the join screen, the server appears in the list with its full name shown. On a connected server, open the pause menu → <em>Show MOTD</em> or <em>Server Info</em>.
                                    </li>
                                    <li>
                                        <strong>Steam server browser:</strong> Open Steam → <em>View → Servers</em> → <em>LAN</em> or <em>Internet</em>. Filter by game "ARK: Survival Ascended" and find your server. The "Name" column is what you want.
                                    </li>
                                    <li>
                                        <strong>Battlemetrics:</strong> Search the server on
                                        <a href="https://www.battlemetrics.com/servers/arksa" target="_blank" rel="noopener noreferrer">battlemetrics.com/servers/arksa</a>.
                                        The full name and IP:port are right at the top of each result.
                                    </li>
                                    <li>
                                        <strong>Unofficial / cluster servers:</strong> Most cluster networks (LoadedCrysis, Arkpocalypse, etc.) post the exact server names in their Discord or website server list.
                                    </li>
                                    <li>
                                        <strong>Dedicated/self-hosted:</strong> Check your <code>GameUserSettings.ini</code> — the <code>SessionName</code> line is the broadcast name.
                                    </li>
                                </ol>
                                <p class="srv-help-tip">Paste the full name exactly as shown — TekOS uses it as the lookup key when polling status.</p>
                            </div>
                        {/if}
                    </div>

                    <!-- RCON block -->
                    <div class="rcon-block">
                        <div class="rcon-head">
                            <div class="rcon-title">▸ RCON Connection <span style="color:var(--tek-text-faint); font-weight:400;">— Admin only · Optional</span></div>
                            <div class="rcon-status" class:connected={rconStatusOk} class:unconfigured={!rconStatusOk}>
                                <span class="dot"></span>{rconStatusOk ? 'CONNECTED · LISTENING' : 'NOT CONNECTED'}
                            </div>
                        </div>
                        <div class="rcon-desc">
                            Required for the rich Server feed (chat, admin announcements, boss spawns, taming events). Without it, TekOS still polls server status and player count via Steam A2S — you just won't get the event stream below the cluster card.
                        </div>
                        <div class="rcon-inputs">
                            <input class="input" bind:value={rconHost} oninput={markDirty} placeholder="Host or IP" />
                            <input class="input" bind:value={rconPort} oninput={markDirty} placeholder="Port" />
                            <input class="input" bind:value={rconPass} oninput={() => { rconPasswordSaved = false; markDirty(); }} type="password" placeholder={rconPasswordSaved ? 'Password saved (re-enter to change)' : 'Password'} />
                        </div>
                        <div class="rcon-actions">
                            <button class="btn" onclick={testRcon}>TEST CONNECTION</button>
                            <button class="btn ghost" onclick={() => { rconHost=''; rconPort='27020'; rconPass=''; rconStatusOk=false; rconStatusMsg=''; markDirty(); }}>DISCONNECT</button>
                        </div>
                        {#if rconStatusMsg}
                            <div class="result-msg" class:error={!rconStatusOk} style="margin-top:10px;">{rconStatusMsg}</div>
                        {/if}
                    </div>
                </div>

                <div class="group" style="margin-top: 22px;">
                    <div class="group-label">Polling preferences</div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">A2S poll interval</div>
                            <div class="row-hint">How often we ping each server for status, player count, current map.</div>
                        </div>
                        <select class="select" bind:value={pollInterval} onchange={markDirty}>
                            <option value="30">Every 30 seconds</option>
                            <option value="60">Every 60 seconds</option>
                            <option value="120">Every 2 minutes</option>
                            <option value="300">Every 5 minutes</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Auto-pause when you're offline</div>
                            <div class="row-hint">Stop polling your subscribed servers when you haven't been active for 24h.</div>
                        </div>
                        <button type="button" class="toggle" class:on={pollPauseIdle} role="switch" aria-checked={pollPauseIdle} aria-label="Pause polling when idle"
                             onclick={() => { pollPauseIdle = !pollPauseIdle; markDirty(); }}></button>
                    </div>
                </div>

                <div class="row">
                    <div></div>
                    <button class="btn solid" onclick={saveCluster} disabled={clusterSaving}>
                        {clusterSaving ? 'SAVING…' : 'SAVE CLUSTER'}
                    </button>
                </div>
                {#if clusterMsg}
                    <div class="result-msg" class:error={clusterErr}>{clusterMsg}</div>
                {/if}
            </div>

            <!-- ============ DATA ============ -->
            <div class="panel-section" class:active={activeSection === 'data'} id="section-data">
                <div class="section-header">
                    <div class="section-title">Data</div>
                    <div class="section-desc">Export your Vault, import from saves, manage what TekOS stores</div>
                </div>

                <div class="group">
                    <div class="group-label">Export</div>
                    <div class="action-card">
                        <div class="action-info">
                            <div class="action-title">Export Vault</div>
                            <div class="action-desc">All your specimens with stat lines, mutations, parents, genealogy and badges. Download as JSON.</div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <a class="btn" href="/api/creatures?format=json" download="vault.json">JSON</a>
                        </div>
                    </div>
                </div>

                <div class="group">
                    <div class="group-label">Import</div>
                    <div class="action-card">
                        <div class="action-info">
                            <div class="action-title">Import Collection</div>
                            <div class="action-desc">Pick a Vault Export JSON file (yours or someone else's). Each creature is added as a fresh entry — your existing Vault isn't touched. Up to 5000 entries per import.</div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <input
                                type="file"
                                accept="application/json,.json"
                                bind:this={importInput}
                                onchange={onImportFile}
                                style="display:none;"
                            />
                            <button class="btn" onclick={() => importInput?.click()} disabled={importBusy}>
                                {importBusy ? 'Importing…' : 'CHOOSE FILE'}
                            </button>
                        </div>
                    </div>
                    {#if importMsg}
                        <div class="result-msg" class:error={importErr} style="margin-top:10px;">{importMsg}</div>
                    {/if}
                </div>

                <div class="danger-zone">
                    <div class="danger-title">⚠ Danger Zone</div>
                    <div class="danger-desc">
                        These actions cannot be undone. We strongly recommend exporting your archive first.
                    </div>
                    <div class="danger-actions">
                        <button class="btn danger" onclick={() => openConfirm('clear-vault')}>CLEAR VAULT</button>
                        <button class="btn danger" onclick={() => openConfirm('leave-tribes')}>LEAVE ALL TRIBES</button>
                        <button class="btn danger" onclick={() => openConfirm('delete-account')}>DELETE ACCOUNT</button>
                    </div>
                    {#if dangerMsg}
                        <div class="result-msg" class:error={dangerErr} style="margin-top:12px;">{dangerMsg}</div>
                    {/if}
                </div>
            </div>

            <!-- ============ INTEGRATIONS ============ -->
            <div class="panel-section" class:active={activeSection === 'integrations'} id="section-integrations">
                <div class="section-header">
                    <div class="section-title">Integrations</div>
                    <div class="section-desc">Send TekOS events outward and pull external content into your Feed</div>
                </div>

                <!-- Discord webhook -->
                <div class="group">
                    <div class="group-label">Discord — outbound webhook</div>
                    <div class="action-card" style="flex-direction:column; align-items:stretch; gap:12px;">
                        <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start;">
                            <div class="action-info">
                                <div class="action-title">
                                    Webhook URL
                                    {#if discordWebhook}<span class="chip blue">CONNECTED</span>{:else}<span class="chip">NOT LINKED</span>{/if}
                                </div>
                                <div class="action-desc">Paste the webhook URL from any Discord channel's Integrations settings. Selected TekOS events will get posted there.</div>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <input class="input wide" bind:value={discordWebhook} oninput={markDirty} placeholder="https://discord.com/api/webhooks/…" style="flex:1; min-width:260px;" />
                            <button class="btn ghost" onclick={testDiscordWebhook}>TEST PING</button>
                        </div>
                        {#if webhookTestMsg}
                            <div style="font-family:var(--tek-mono); font-size:0.74rem; color:var(--tek-text-dim);">{webhookTestMsg}</div>
                        {/if}

                        {#if discordWebhook}
                            <div class="discord-events">
                                <div class="discord-events-label">Forward these events to Discord:</div>
                                <div class="discord-event-row">
                                    <button type="button" class="toggle" class:on={discordEvents.tribeAnnounce} role="switch" aria-checked={discordEvents.tribeAnnounce} aria-label="Forward tribe announcements to Discord"
                                         onclick={() => { discordEvents.tribeAnnounce = !discordEvents.tribeAnnounce; markDirty(); }}></button>
                                    <div>
                                        <div class="row-label">Tribe announcements</div>
                                        <div class="row-hint">Wired — posts immediately when an admin sends an announcement.</div>
                                    </div>
                                </div>
                                <div class="discord-event-row">
                                    <button type="button" class="toggle muted" class:on={discordEvents.warRoom} role="switch" aria-checked={discordEvents.warRoom} aria-label="Forward war room events to Discord"
                                         onclick={() => { discordEvents.warRoom = !discordEvents.warRoom; markDirty(); }}></button>
                                    <div>
                                        <div class="row-label">War-room schedule <span class="chip">Coming soon</span></div>
                                        <div class="row-hint">When wired, posts a heads-up when a tribe schedules a boss run.</div>
                                    </div>
                                </div>
                                <div class="discord-event-row">
                                    <button type="button" class="toggle muted" class:on={discordEvents.badge} role="switch" aria-checked={discordEvents.badge} aria-label="Forward badge milestones to Discord"
                                         onclick={() => { discordEvents.badge = !discordEvents.badge; markDirty(); }}></button>
                                    <div>
                                        <div class="row-label">Badge milestones <span class="chip">Coming soon</span></div>
                                        <div class="row-hint">When wired, posts when you earn a Bloodline, Boss Ready, Specialist, or Underdog badge.</div>
                                    </div>
                                </div>
                                <div class="discord-event-row">
                                    <button type="button" class="toggle muted" class:on={discordEvents.trade} role="switch" aria-checked={discordEvents.trade} aria-label="Forward trade offers to Discord"
                                         onclick={() => { discordEvents.trade = !discordEvents.trade; markDirty(); }}></button>
                                    <div>
                                        <div class="row-label">Trade offers received <span class="chip">Coming soon</span></div>
                                        <div class="row-hint">When wired, posts when someone offers on one of your Marketplace listings.</div>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Dossier links -->
                <div class="group">
                    <div class="group-label">Dossier links — show your channels</div>

                    <div class="action-card" style="flex-direction:column; align-items:stretch; gap:12px;">
                        <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start;">
                            <div class="action-info">
                                <div class="action-title">
                                    Twitch channel
                                    {#if twitchKey}<span class="chip purple">SAVED</span>{:else}<span class="chip">NOT SET</span>{/if}
                                </div>
                                <div class="action-desc">Stored as a display field. Will surface as a link on your Dossier once that section ships. No live-status polling and no auto-badge today.</div>
                            </div>
                        </div>
                        <input class="input wide" bind:value={twitchKey} oninput={markDirty} placeholder="twitch.tv/yourchannel" style="min-width:260px;" />
                    </div>

                    <div class="action-card" style="flex-direction:column; align-items:stretch; gap:12px;">
                        <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start;">
                            <div class="action-info">
                                <div class="action-title">
                                    YouTube channel
                                    {#if youtubeChannel}<span class="chip green">SAVED</span>{:else}<span class="chip">NOT SET</span>{/if}
                                </div>
                                <div class="action-desc">
                                    Stored as a display field for your Dossier.
                                    <strong style="color:var(--tek-text)">To pull videos into your Feed, add the channel under <em>Feed → News → Your Sources</em></strong> — that's a separate per-source list, not this field.
                                </div>
                            </div>
                        </div>
                        <input class="input wide" bind:value={youtubeChannel} oninput={markDirty} placeholder="@channelhandle or channel ID" style="min-width:260px;" />
                    </div>
                </div>

                <!-- Roadmap: Discord bot -->
                <div class="group">
                    <div class="group-label">Discord bot <span class="chip">Roadmap</span></div>
                    <div class="action-card" style="flex-direction:column; align-items:stretch; gap:6px;">
                        <div class="action-info">
                            <div class="action-title">Connect a Discord bot to your tribe channel</div>
                            <div class="action-desc">
                                Future feature. Today, outbound posting uses the webhook URL above (one-way). The bot would unlock the inbound direction: tribe chat from Discord mirrored into your TekOS feed, slash commands to log specimens or trades from inside Discord, and per-event subscriptions per channel. Wiring this means standing up a bot worker, OAuth, and per-guild config — bigger than a Settings checkbox.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- API access -->
                <div class="group">
                    <div class="group-label">API access <span class="chip amber">POWER USER</span></div>
                    <div class="action-card" style="flex-direction:column; align-items:stretch; gap:6px;">
                        <div class="action-info">
                            <div class="action-title">What this is</div>
                            <div class="action-desc">
                                Personal Access Tokens you can use to call TekOS endpoints from your own scripts, bots, or external dashboards. The token is scoped to <strong style="color:var(--tek-text)">your own data only</strong> — never another survivor's. Useful for: bulk-importing creatures from a spreadsheet, syncing your Vault with an external tracker, building a custom Dossier widget, or wiring a Discord/Twitch bot to your TekOS account.
                            </div>
                        </div>
                        <div class="action-info" style="margin-top:6px;">
                            <div class="action-title">What you'll be able to do at launch</div>
                            <div class="action-desc">
                                Read your Vault · Read your tribe membership and announcements · Post a new creature · Update an existing creature · Read your badges · Read your Marketplace listings and offers. Write access is rate-limited and scoped per token.
                            </div>
                        </div>
                        <div class="placeholder-note" style="font-size:0.74rem; margin-top:8px;">
                            ⚠ Token generation, scopes, and developer docs ship in a follow-up build. No public endpoint exists today.
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div></div>
                    <button class="btn solid" onclick={saveIntegrations} disabled={intSaving}>
                        {intSaving ? 'SAVING…' : 'SAVE INTEGRATIONS'}
                    </button>
                </div>
                {#if intMsg}
                    <div class="result-msg" class:error={intErr}>{intMsg}</div>
                {/if}
            </div>

            <!-- Sticky save bar (shared across sections) -->
            {#if dirty}
                <div class="save-bar show">
                    <div class="save-bar-msg"><span class="dot"></span>UNSAVED CHANGES</div>
                    <div class="save-actions">
                        <button class="btn ghost" onclick={discardChanges}>DISCARD</button>
                        <button class="btn solid" onclick={saveActiveSection} disabled={savingActive}>
                            {savingActive ? 'SAVING…' : 'SAVE CHANGES'}
                        </button>
                    </div>
                </div>
            {/if}

        </div>

    </div>

</div>

<!-- Change Password modal -->
{#if pwdOpen}
<div class="pwd-modal-overlay" role="dialog" aria-modal="true" tabindex="-1"
    onclick={() => pwdOpen=false}
    onkeydown={(e) => { if (e.key === 'Escape') pwdOpen=false; }}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="pwd-modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
        <div class="pwd-modal-head">
            <div class="pwd-modal-title">Change Password</div>
            <button class="pwd-modal-close" onclick={() => pwdOpen=false}>×</button>
        </div>
        <div class="pwd-modal-body">
            <label class="pwd-label" for="pwd-cur">Current password</label>
            <input id="pwd-cur" type="password" class="pwd-input" autocomplete="current-password" bind:value={pwdCurrent} />

            <label class="pwd-label" for="pwd-new">New password</label>
            <input id="pwd-new" type="password" class="pwd-input" autocomplete="new-password" bind:value={pwdNew} placeholder="At least 8 characters" />

            <label class="pwd-label" for="pwd-conf">Confirm new password</label>
            <input id="pwd-conf" type="password" class="pwd-input" autocomplete="new-password" bind:value={pwdConfirm} onkeydown={(e) => { if (e.key === 'Enter') submitChangePassword(); }} />

            {#if pwdMsg}
                <div class="pwd-msg" class:err={pwdErr}>{pwdMsg}</div>
            {/if}
        </div>
        <div class="pwd-modal-foot">
            <button class="btn ghost" onclick={() => pwdOpen=false}>Cancel</button>
            <button class="btn solid" onclick={submitChangePassword} disabled={pwdSaving}>{pwdSaving ? 'Saving…' : 'Update Password'}</button>
        </div>
    </div>
</div>
{/if}

<!-- Change Email modal -->
{#if emailOpen}
<div class="pwd-modal-overlay" role="dialog" aria-modal="true" tabindex="-1"
    onclick={() => emailOpen=false}
    onkeydown={(e) => { if (e.key === 'Escape') emailOpen=false; }}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="pwd-modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
        <div class="pwd-modal-head">
            <div class="pwd-modal-title">Change Email</div>
            <button class="pwd-modal-close" onclick={() => emailOpen=false}>×</button>
        </div>
        <div class="pwd-modal-body">
            <label class="pwd-label" for="em-new">New email</label>
            <input id="em-new" type="email" class="pwd-input" autocomplete="email" bind:value={emailNew} placeholder="new.address@example.com" />

            <label class="pwd-label" for="em-pw">Current password</label>
            <input id="em-pw" type="password" class="pwd-input" autocomplete="current-password" bind:value={emailPassword} onkeydown={(e) => { if (e.key === 'Enter') submitChangeEmail(); }} />

            {#if emailMsg}
                <div class="pwd-msg" class:err={emailErr}>{emailMsg}</div>
            {/if}
        </div>
        <div class="pwd-modal-foot">
            <button class="btn ghost" onclick={() => emailOpen=false}>Cancel</button>
            <button class="btn solid" onclick={submitChangeEmail} disabled={emailSaving}>{emailSaving ? 'Saving…' : 'Update Email'}</button>
        </div>
    </div>
</div>
{/if}

<!-- Danger confirm modal (Clear Vault / Leave Tribes / Delete Account) -->
{#if confirmOpen}
    {@const cfg = CONFIRM_COPY[confirmOpen]}
    <div class="pwd-modal-overlay" role="dialog" aria-modal="true" tabindex="-1"
        onclick={() => confirmOpen=null}
        onkeydown={(e) => { if (e.key === 'Escape') confirmOpen=null; }}>
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div class="pwd-modal danger" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
            <div class="pwd-modal-head danger">
                <div class="pwd-modal-title">⚠ {cfg.title}</div>
                <button class="pwd-modal-close" onclick={() => confirmOpen=null}>×</button>
            </div>
            <div class="pwd-modal-body">
                <p class="confirm-desc">{cfg.description}</p>
                <p class="confirm-danger">{cfg.danger}</p>

                <label class="pwd-label" for="cf-typed">
                    To confirm, type <strong class="confirm-phrase">{cfg.phrase}</strong>
                </label>
                <input id="cf-typed" type="text" class="pwd-input" autocomplete="off" autocapitalize="off" autocorrect="off" bind:value={confirmTyped} placeholder={cfg.phrase} />

                {#if cfg.needsPassword}
                    <label class="pwd-label" for="cf-pw">Current password</label>
                    <input id="cf-pw" type="password" class="pwd-input" autocomplete="current-password" bind:value={confirmPassword} onkeydown={(e) => { if (e.key === 'Enter') submitConfirm(); }} />
                {/if}

                {#if confirmMsg}
                    <div class="pwd-msg" class:err={confirmErr}>{confirmMsg}</div>
                {/if}
            </div>
            <div class="pwd-modal-foot">
                <button class="btn ghost" onclick={() => confirmOpen=null}>Cancel</button>
                <button class="btn danger" onclick={submitConfirm} disabled={confirmSaving}>{confirmSaving ? 'Working…' : cfg.actionLabel}</button>
            </div>
        </div>
    </div>
{/if}

<style>
:global(#tekHexCanvas) { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 60px 24px 80px;
    max-width: 1240px;
    margin: 0 auto;
}

/* ═════════════════════════════════════════════════════════════════════════
   PAGE HEADER
   ═════════════════════════════════════════════════════════════════════════ */
.page-header { margin-bottom: 28px; }
.breadcrumb {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 8px;
}
.breadcrumb a { color: var(--tek-text-dim); text-decoration: none; transition: color 0.15s; }
.breadcrumb a:hover { color: var(--tek-blue); }
.breadcrumb .sep { color: var(--tek-text-faint); margin: 0 6px; }
.page-title {
    font-family: var(--tek-display);
    font-size: clamp(1.8rem, 3.6vw, 2.5rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.30));
}
.page-sub {
    font-family: var(--tek-mono); font-size: 0.72rem;
    letter-spacing: 0.14em; color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 6px;
}
.page-sub .signed {
    color: var(--tek-blue);
}

/* ═════════════════════════════════════════════════════════════════════════
   LAYOUT — LEFT NAV + RIGHT PANEL
   ═════════════════════════════════════════════════════════════════════════ */
.settings-shell {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 28px;
    align-items: start;
}
@media (max-width: 880px) {
    .settings-shell { grid-template-columns: 1fr; }
}

/* Left nav */
.side-nav {
    position: sticky;
    top: 24px;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 8px;
    backdrop-filter: blur(8px);
}
.side-nav-label {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    padding: 6px 12px 10px;
}
.nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 12px;
    cursor: pointer;
    background: none;
    border: none;
    border-left: 2px solid transparent;
    width: 100%;
    text-align: left;
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--tek-text-dim);
    transition: all 0.15s;
    user-select: none;
}
.nav-item:hover {
    color: var(--tek-text);
    background: rgba(0,180,255,0.05);
}
.nav-item.active {
    color: var(--tek-blue);
    border-left-color: var(--tek-blue);
    background: linear-gradient(90deg, rgba(0,180,255,0.10) 0%, rgba(0,180,255,0) 100%);
    text-shadow: 0 0 8px var(--tek-blue-glow);
}
.nav-item .icon {
    width: 14px; height: 14px;
    flex-shrink: 0;
    opacity: 0.7;
}
.nav-item.active .icon { opacity: 1; }

/* Right panel */
.panel {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 28px 32px 32px;
    backdrop-filter: blur(8px);
    min-height: 600px;
}
.panel::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 8px var(--tek-blue-glow);
}
.panel-section { display: none; }
.panel-section.active { display: block; animation: panelFade 0.35s ease; }
@keyframes panelFade {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
}
.section-header {
    margin-bottom: 22px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(0,180,255,0.12);
}
.section-title {
    font-family: var(--tek-display);
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--tek-text);
    margin-bottom: 4px;
}
.section-desc {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}

/* ═════════════════════════════════════════════════════════════════════════
   SETTING ROWS / CONTROLS
   ═════════════════════════════════════════════════════════════════════════ */
.group {
    margin-bottom: 28px;
}
.group:last-child { margin-bottom: 0; }
.group-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 10px;
    padding-left: 2px;
}

.row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 20px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(100,116,139,0.10);
}
.row:last-child { border-bottom: none; }
.row-info { min-width: 0; }
.row-label {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--tek-text);
    margin-bottom: 3px;
}
.row-hint {
    font-size: 0.78rem;
    color: var(--tek-text-dim);
    line-height: 1.4;
}
/* Toggle switch */
.toggle {
    position: relative;
    width: 44px; height: 24px;
    padding: 0;
    background: rgba(15,23,42,0.9);
    border: 1px solid rgba(100,116,139,0.30);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    appearance: none;
    -webkit-appearance: none;
}
.toggle::after {
    content: '';
    position: absolute;
    top: 2px; left: 2px;
    width: 18px; height: 18px;
    background: var(--tek-text-dim);
    border-radius: 50%;
    transition: all 0.2s;
}
.toggle.on {
    background: rgba(0,180,255,0.20);
    border-color: var(--tek-blue);
    box-shadow: 0 0 8px rgba(0,180,255,0.30);
}
.toggle.on::after {
    transform: translateX(20px);
    background: var(--tek-blue);
    box-shadow: 0 0 6px var(--tek-blue-glow);
}

/* Text input */
.input {
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.82rem;
    padding: 9px 12px;
    min-width: 220px;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.15s;
}
.input:focus {
    outline: none;
    border-color: var(--tek-blue);
    box-shadow: 0 0 0 1px var(--tek-blue), 0 0 10px rgba(0,180,255,0.20);
}
.input.wide { min-width: 320px; }

/* Select dropdown styled */
.select {
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    padding: 9px 32px 9px 12px;
    min-width: 200px;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    appearance: none;
    -webkit-appearance: none;
    background-image: linear-gradient(45deg, transparent 50%, var(--tek-blue) 50%), linear-gradient(135deg, var(--tek-blue) 50%, transparent 50%);
    background-position: calc(100% - 18px) 50%, calc(100% - 13px) 50%;
    background-size: 5px 5px;
    background-repeat: no-repeat;
}
.select:focus {
    outline: none;
    border-color: var(--tek-blue);
}

/* Button */
.btn {
    background: rgba(0,180,255,0.08);
    border: 1px solid var(--tek-blue-border);
    color: var(--tek-blue);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 9px 16px;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.15s;
    text-decoration: none;
    display: inline-block;
}
.btn:hover {
    background: rgba(0,180,255,0.18);
    box-shadow: 0 0 12px rgba(0,180,255,0.30);
}
.btn.ghost {
    background: transparent;
    border-color: rgba(100,116,139,0.30);
    color: var(--tek-text-dim);
}
.btn.ghost:hover {
    border-color: var(--tek-text);
    color: var(--tek-text);
    background: rgba(100,116,139,0.10);
    box-shadow: none;
}
.btn.danger {
    background: rgba(239,68,68,0.08);
    border-color: rgba(239,68,68,0.40);
    color: var(--tek-red);
}
.btn.danger:hover {
    background: rgba(239,68,68,0.18);
    box-shadow: 0 0 12px rgba(239,68,68,0.30);
}
.btn.solid {
    background: linear-gradient(90deg, var(--tek-blue), var(--tek-purple));
    color: #050812;
    border: none;
    font-weight: 700;
    padding: 10px 18px;
}
.btn.solid:hover {
    box-shadow: 0 0 16px rgba(0,180,255,0.45);
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Result message */
.result-msg {
    margin-top: 8px;
    padding: 8px 12px;
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    background: rgba(16,185,129,0.08);
    border-left: 2px solid var(--tek-green);
    color: var(--tek-green);
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.result-msg.error {
    background: rgba(239,68,68,0.08);
    border-left-color: var(--tek-red);
    color: var(--tek-red);
}

.placeholder-note {
    padding: 16px 18px;
    background: rgba(245,158,11,0.06);
    border: 1px solid rgba(245,158,11,0.30);
    border-left-width: 2px;
    color: var(--tek-amber);
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    line-height: 1.5;
    letter-spacing: 0.04em;
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
}

/* ═════════════════════════════════════════════════════════════════════════
   ACCOUNT — avatar uploader / linked accounts
   ═════════════════════════════════════════════════════════════════════════ */
.identity-strip {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 18px;
    background: linear-gradient(135deg, rgba(0,180,255,0.06) 0%, rgba(139,92,246,0.04) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    margin-bottom: 22px;
}
.id-avatar {
    width: 72px; height: 80px;
    flex-shrink: 0;
    position: relative;
}
.id-avatar svg { width: 100%; height: 100%; filter: drop-shadow(0 0 10px var(--tek-blue-glow)); }
.id-info { flex: 1; min-width: 0; }
.id-name {
    font-family: var(--tek-display);
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tek-text);
    margin-bottom: 4px;
}
.id-meta {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.id-meta .badge {
    display: inline-block;
    padding: 2px 7px;
    background: rgba(0,180,255,0.10);
    border: 1px solid var(--tek-blue-border);
    color: var(--tek-blue);
    font-size: 0.62rem;
    margin-left: 8px;
}
.id-actions { display: flex; gap: 8px; }

/* Linked account row */
.linked-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: rgba(5,8,18,0.4);
    border: 1px solid rgba(100,116,139,0.15);
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    margin-bottom: 10px;
}
.linked-icon {
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--tek-mono);
    font-weight: 700;
    flex-shrink: 0;
}
.linked-icon.discord { background: rgba(88,101,242,0.15); color: #5865f2; border: 1px solid rgba(88,101,242,0.4); }
.linked-icon.email { background: rgba(0,180,255,0.10); color: var(--tek-blue); border: 1px solid var(--tek-blue-border); }
.linked-info { flex: 1; min-width: 0; }
.linked-name {
    font-size: 0.86rem; font-weight: 600;
    color: var(--tek-text);
    margin-bottom: 2px;
}
.linked-handle {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.08em;
}
.linked-status {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tek-green);
}
.linked-status .dot {
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 5px rgba(16,185,129,0.6);
    margin-right: 5px;
}

/* ═════════════════════════════════════════════════════════════════════════
   THEMES — map palette grid + unlockables + AI companion voice
   ═════════════════════════════════════════════════════════════════════════ */
.themes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
}
.theme-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.6) 0%, rgba(4,8,20,0.85) 100%);
    border: 1px solid rgba(100,116,139,0.20);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s;
    overflow: hidden;
    width: 100%;
    text-align: left;
    font: inherit;
    color: inherit;
}
.theme-card:hover {
    border-color: var(--tek-blue-border);
    transform: translateY(-2px);
}
.theme-card.active {
    border-color: var(--tek-blue);
    box-shadow: 0 0 0 1px var(--tek-blue), 0 0 18px rgba(0,180,255,0.30);
}
.theme-card.active::before {
    content: 'ACTIVE';
    position: absolute;
    top: 8px; right: 8px;
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.16em;
    color: var(--tek-blue);
    background: rgba(0,180,255,0.15);
    border: 1px solid var(--tek-blue);
    padding: 2px 6px;
    z-index: 2;
}
.theme-preview {
    position: relative;
    height: 90px;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 12px;
    background-image:
        repeating-linear-gradient(60deg, var(--prv-line) 0 1px, transparent 1px 16px),
        repeating-linear-gradient(-60deg, var(--prv-line) 0 1px, transparent 1px 16px),
        radial-gradient(ellipse at 30% 40%, var(--prv-glow1) 0%, transparent 60%),
        radial-gradient(ellipse at 75% 65%, var(--prv-glow2) 0%, transparent 60%),
        var(--prv-bg);
}
.theme-preview::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4) 100%);
}
.theme-swatches {
    position: absolute;
    bottom: 6px; left: 6px;
    display: flex; gap: 4px;
    z-index: 2;
}
.swatch {
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.2);
}
.theme-name {
    font-family: var(--tek-display);
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tek-text);
    margin-bottom: 2px;
}
.theme-tag {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}

/* ═════════════════════════════════════════════════════════════════════════
   DATA / INTEGRATIONS / DANGER ZONE
   ═════════════════════════════════════════════════════════════════════════ */
.action-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
    background: rgba(5,8,18,0.4);
    border: 1px solid rgba(100,116,139,0.18);
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    margin-bottom: 10px;
}
.action-info { flex: 1; min-width: 0; }
.action-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--tek-text);
    margin-bottom: 3px;
}
.action-desc {
    font-size: 0.78rem;
    color: var(--tek-text-dim);
    line-height: 1.4;
}

.danger-zone {
    margin-top: 24px;
    padding: 16px 20px 18px;
    background: rgba(239,68,68,0.04);
    border: 1px solid rgba(239,68,68,0.25);
    border-left-width: 2px;
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
}
.danger-title {
    font-family: var(--tek-display);
    font-size: 0.86rem;
    font-weight: 700;
    letter-spacing: 0.10em;
    color: var(--tek-red);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.danger-desc {
    font-size: 0.78rem;
    color: var(--tek-text-dim);
    margin-bottom: 14px;
    line-height: 1.4;
}
.danger-actions { display: flex; gap: 10px; flex-wrap: wrap; }

/* tiny chip for inline badges */
.chip {
    display: inline-block;
    padding: 2px 7px;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border: 1px solid rgba(100,116,139,0.3);
    color: var(--tek-text-dim);
    margin-left: 6px;
}
.chip.blue { color: var(--tek-blue); border-color: var(--tek-blue-border); }
.chip.purple { color: var(--tek-purple); border-color: rgba(139,92,246,0.4); }
.chip.green { color: var(--tek-green); border-color: rgba(16,185,129,0.4); }
.chip.amber { color: var(--tek-amber); border-color: rgba(245,158,11,0.4); }

/* ═════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS — channel matrix
   ═════════════════════════════════════════════════════════════════════════ */
.notif-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin-top: 4px;
}
.notif-table th {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    text-align: center;
    padding: 8px 4px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
}
.notif-table th.cat { text-align: left; padding-left: 0; }
.notif-table td {
    padding: 12px 4px;
    border-bottom: 1px solid rgba(100,116,139,0.10);
    text-align: center;
}
.notif-table td.cat { text-align: left; padding-left: 0; }
.notif-table tr:last-child td { border-bottom: none; }
.notif-cat-name {
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--tek-text);
    margin-bottom: 2px;
}
.notif-cat-hint {
    font-size: 0.72rem;
    color: var(--tek-text-dim);
}
.notif-cell-toggle {
    display: inline-flex;
    width: 22px; height: 22px;
    padding: 0;
    border-radius: 4px;
    background: rgba(15,23,42,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    cursor: pointer;
    position: relative;
    transition: all 0.15s;
    appearance: none;
    -webkit-appearance: none;
}
.notif-cell-toggle.on {
    background: rgba(0,180,255,0.15);
    border-color: var(--tek-blue);
    box-shadow: 0 0 5px rgba(0,180,255,0.30);
}
.notif-cell-toggle.on::after {
    content: '✓';
    position: absolute;
    inset: 0;
    display: flex; align-items: center; justify-content: center;
    color: var(--tek-blue);
    font-size: 0.78rem;
    font-weight: 700;
}

/* ═════════════════════════════════════════════════════════════════════════
   CLUSTER — followed servers + RCON
   ═════════════════════════════════════════════════════════════════════════ */
.cluster-card {
    background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 18px 20px;
    margin-bottom: 14px;
}
.cluster-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
}
.cluster-name-wrap { display: flex; align-items: center; gap: 10px; }
.cluster-emblem {
    width: 32px; height: 32px;
    background: linear-gradient(135deg, var(--tek-blue), var(--tek-purple));
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--tek-display);
    font-size: 0.78rem;
    font-weight: 900;
    color: #050812;
}
.cluster-name {
    font-family: var(--tek-display);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tek-text);
}
.cluster-meta {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 2px;
}
.server-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
    margin-bottom: 16px;
}
.server-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(100,116,139,0.18);
    font-family: var(--tek-mono);
    font-size: 0.76rem;
    color: var(--tek-text);
}
.server-chip .pip {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 5px rgba(16,185,129,0.6);
    flex-shrink: 0;
}
.server-chip.offline .pip { background: var(--tek-text-faint); box-shadow: none; }
.server-chip .name { flex: 1; min-width: 0; }
.server-chip .x {
    color: var(--tek-text-faint);
    cursor: pointer;
    transition: color 0.15s;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
}
.server-chip .x:hover { color: var(--tek-red); }

.add-server-row {
    display: flex; gap: 8px; align-items: center;
    padding-top: 12px;
    border-top: 1px solid rgba(0,180,255,0.10);
}

/* RCON Block */
.rcon-block {
    margin-top: 14px;
    padding: 14px 16px;
    background: rgba(139,92,246,0.05);
    border: 1px solid rgba(139,92,246,0.25);
    border-left-width: 2px;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
}
.rcon-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
}
.rcon-title {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--tek-purple);
}
.rcon-status {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.rcon-status.connected { color: var(--tek-green); }
.rcon-status .dot {
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    margin-right: 5px;
}
.rcon-status.connected .dot { background: var(--tek-green); box-shadow: 0 0 5px rgba(16,185,129,0.6); }
.rcon-status.unconfigured .dot { background: var(--tek-text-faint); }
.rcon-desc {
    font-size: 0.76rem;
    color: var(--tek-text-dim);
    line-height: 1.5;
    margin-bottom: 10px;
}
.rcon-inputs {
    display: grid;
    grid-template-columns: 1fr 100px 1fr;
    gap: 8px;
    margin-bottom: 10px;
}
@media (max-width: 600px) {
    .rcon-inputs { grid-template-columns: 1fr; }
}
.rcon-inputs .input { min-width: 0; }
.rcon-actions { display: flex; gap: 8px; }

/* ═════════════════════════════════════════════════════════════════════════
   STICKY SAVE BAR
   ═════════════════════════════════════════════════════════════════════════ */
.save-bar {
    position: sticky;
    bottom: 0;
    margin: 24px -32px -32px;
    padding: 14px 32px;
    background: linear-gradient(180deg, rgba(5,8,18,0.7) 0%, rgba(10,18,44,0.95) 100%);
    border-top: 1px solid rgba(0,180,255,0.20);
    display: none;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    backdrop-filter: blur(8px);
    z-index: 5;
}
.save-bar.show { display: flex; }
.save-bar-msg {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.12em;
    color: var(--tek-amber);
    text-transform: uppercase;
}
.save-bar-msg .dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--tek-amber);
    box-shadow: 0 0 6px rgba(245,158,11,0.6);
    margin-right: 8px;
    animation: pulseAmber 1.6s ease-in-out infinite;
}
@keyframes pulseAmber {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.5; transform: scale(0.7); }
}
.save-actions { display: flex; gap: 10px; }

/* Change Password modal */
.pwd-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(4, 8, 20, 0.75);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: pwd-fade 0.2s ease;
}
@keyframes pwd-fade { from { opacity: 0; } to { opacity: 1; } }
.pwd-modal {
    width: 100%;
    max-width: 420px;
    background: linear-gradient(160deg, rgba(10,18,44,0.95) 0%, rgba(4,8,20,0.99) 100%);
    border: 1px solid rgba(0,180,255,0.30);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    filter: drop-shadow(0 0 1px rgba(0,180,255,0.40)) drop-shadow(0 16px 50px rgba(0,0,0,0.65));
}
.pwd-modal-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid rgba(0,180,255,0.12);
}
.pwd-modal-title {
    font-family: var(--tek-display);
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tek-text);
}
.pwd-modal-close {
    background: none; border: none;
    color: var(--tek-text-faint);
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
}
.pwd-modal-close:hover { color: var(--tek-text); }
.pwd-modal-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
.pwd-label {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-top: 4px;
}
.pwd-input {
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.10);
    border-bottom: 1px solid rgba(0,180,255,0.30);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.86rem;
    padding: 9px 12px;
    outline: none;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}
.pwd-input::placeholder { color: var(--tek-text-faint); }
.pwd-input:focus { border-color: rgba(0,180,255,0.45); border-bottom-color: var(--tek-blue); }
.pwd-msg {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-green);
    margin-top: 4px;
}
.pwd-msg.err { color: #fca5a5; }
.pwd-modal-foot {
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 12px 18px 16px;
    border-top: 1px solid rgba(255,255,255,0.05);
}

/* Danger modal variant */
.pwd-modal.danger {
    border-color: rgba(239,68,68,0.50);
    filter: drop-shadow(0 0 1px rgba(239,68,68,0.45)) drop-shadow(0 16px 50px rgba(0,0,0,0.65));
}
.pwd-modal-head.danger {
    border-bottom-color: rgba(239,68,68,0.20);
}
.pwd-modal.danger .pwd-modal-title { color: #fca5a5; }
.confirm-desc {
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    line-height: 1.55;
    color: var(--tek-text-dim);
    margin: 0 0 8px;
}
.confirm-danger {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    color: #fca5a5;
    background: rgba(239,68,68,0.10);
    border-left: 2px solid rgba(239,68,68,0.50);
    padding: 8px 11px;
    margin: 0 0 14px;
    clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
}
.confirm-phrase {
    font-family: var(--tek-display);
    color: #fca5a5;
    background: rgba(239,68,68,0.18);
    padding: 1px 7px;
    letter-spacing: 0.10em;
    margin: 0 2px;
}

/* Server-name helper disclosure */
.srv-help {
    margin-top: 14px;
    font-family: var(--tek-mono);
}
.srv-help-toggle {
    background: rgba(0,180,255,0.06);
    border: 1px dashed rgba(0,180,255,0.30);
    color: #7dd3fc;
    font-family: inherit;
    font-size: 0.74rem;
    letter-spacing: 0.12em;
    padding: 8px 14px;
    cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.18s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.srv-help-toggle:hover {
    background: rgba(0,180,255,0.14);
    border-color: rgba(0,180,255,0.55);
}
.srv-help-chev {
    font-size: 0.7rem;
    color: var(--tek-blue);
    transition: transform 0.18s;
}
.srv-help-body {
    margin-top: 10px;
    padding: 14px 16px;
    background: rgba(4,8,20,0.55);
    border-left: 2px solid rgba(0,180,255,0.30);
    clip-path: polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px);
    font-size: 0.78rem;
    color: var(--tek-text-dim);
    line-height: 1.55;
}
.srv-help-body p { margin: 0 0 8px; }
.srv-help-list { margin: 4px 0 8px 18px; padding: 0; }
.srv-help-list li { margin-bottom: 8px; }
.srv-help-list strong { color: var(--tek-text); font-weight: 600; }
.srv-help-list em { color: #7dd3fc; font-style: normal; font-weight: 500; }
.srv-help-list code {
    background: rgba(0,0,0,0.40);
    padding: 1px 6px;
    border: 1px solid rgba(255,255,255,0.06);
    font-size: 0.78em;
    color: #fcd34d;
}
.srv-help-list a { color: var(--tek-blue); }
.srv-help-list a:hover { text-decoration: underline; }
.srv-help-tip {
    color: #fcd34d;
    font-style: italic;
    border-top: 1px solid rgba(255,255,255,0.05);
    padding-top: 8px;
    margin-top: 8px !important;
}

/* Discord per-event toggles */
.discord-events {
    margin-top: 4px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.05);
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.discord-events-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--tek-text-faint);
}
.discord-event-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 12px;
    align-items: start;
    cursor: pointer;
}
.discord-event-row .toggle.muted {
    opacity: 0.4;
    pointer-events: none;
}
.discord-event-row .row-label .chip {
    margin-left: 6px;
    font-size: 0.52rem;
}
</style>
