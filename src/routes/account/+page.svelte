<script lang="ts">
	import { User, Lock, AlertTriangle, Check, ArrowLeft } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const profile = data.profile as Record<string,unknown>;

	// Profile fields
	let nickname   = $state(String(profile?.nickname ?? ''));
	let bio        = $state(String(profile?.bio ?? ''));
	let lookingFor = $state(String(profile?.lookingFor ?? ''));
	let profSaving = $state(false);
	let profMsg    = $state('');
	let profErr    = $state(false);

	// Password
	let curPwd    = $state('');
	let newPwd    = $state('');
	let pwdSaving = $state(false);
	let pwdMsg    = $state('');
	let pwdErr    = $state(false);

	// Delete
	let delConfirm = $state(false);
	let delPwd     = $state('');
	let delSaving  = $state(false);

	async function saveProfile() {
		profSaving = true; profMsg = ''; profErr = false;
		const res = await fetch('/api/profile', {
			method: 'PUT', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ nickname: nickname || null, bio: bio || null, lookingFor: lookingFor || null })
		});
		const body = await res.json();
		if (res.ok) { profMsg = 'Profile updated.'; }
		else { profMsg = body.error ?? 'Failed'; profErr = true; }
		profSaving = false;
	}

	async function changePassword() {
		if (!curPwd || !newPwd) return;
		pwdSaving = true; pwdMsg = ''; pwdErr = false;
		const res = await fetch('/api/profile', {
			method: 'PUT', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd })
		});
		const body = await res.json();
		if (res.ok) { pwdMsg = 'Password updated.'; curPwd = ''; newPwd = ''; }
		else { pwdMsg = body.error ?? 'Failed'; pwdErr = true; }
		pwdSaving = false;
	}

	async function deleteAccount() {
		if (!delPwd) return;
		delSaving = true;
		const res = await fetch('/api/profile', { method: 'DELETE' });
		if (res.ok) { await fetch('/api/auth/logout'); window.location.href = '/login'; }
		else { alert('Failed to delete account.'); delSaving = false; }
	}
</script>

<div class="std-page acc-page">
	<div class="acc-header">
		<a href="/dossier" class="btn btn-secondary btn-sm"><ArrowLeft size={14} /> Dossier</a>
		<div class="page-title">
			<h1>Edit Account</h1>
			<div class="page-subtitle">{String(profile?.nickname ?? profile?.email ?? 'Survivor')}</div>
		</div>
	</div>

	<!-- ── Profile ───────────────────────────────────────────────────── -->
	<div class="acc-section">
		<div class="acc-section-title"><User size={14} /> Profile</div>
		<div class="acc-fields">
			<div class="plan-field">
				<label class="form-label" for="acc-nick">Callsign (nickname)</label>
				<input id="acc-nick" class="form-control" bind:value={nickname} placeholder="Leave blank to show email" />
			</div>
			<div class="plan-field">
				<label class="form-label" for="acc-bio">Bio</label>
				<textarea id="acc-bio" class="form-control" rows="3" bind:value={bio} placeholder="Tell survivors about yourself..."></textarea>
			</div>
			<div class="plan-field">
				<label class="form-label" for="acc-lf">Looking For</label>
				<input id="acc-lf" class="form-control" bind:value={lookingFor} placeholder="e.g. Mutation breeders, PvP tribe, casual allies..." />
			</div>
			{#if profile?.discordName}
				<div class="acc-discord-note">Discord: <strong>{String(profile.discordName)}</strong> — managed through Discord OAuth</div>
			{/if}
			{#if profMsg}
				<div class="acc-msg" class:acc-err={profErr}>{profMsg}</div>
			{/if}
		</div>
		<button class="btn btn-primary" onclick={saveProfile} disabled={profSaving}>
			{#if profSaving}Saving...{:else}<Check size={14} /> Save Profile{/if}
		</button>
	</div>

	<!-- ── Password ──────────────────────────────────────────────────── -->
	<div class="acc-section">
		<div class="acc-section-title"><Lock size={14} /> Change Password</div>
		<div class="acc-fields">
			<div class="plan-field">
				<label class="form-label" for="acc-cur">Current Password</label>
				<input id="acc-cur" class="form-control" type="password" bind:value={curPwd} autocomplete="current-password" />
			</div>
			<div class="plan-field">
				<label class="form-label" for="acc-new">New Password</label>
				<input id="acc-new" class="form-control" type="password" bind:value={newPwd} autocomplete="new-password" />
			</div>
			{#if pwdMsg}
				<div class="acc-msg" class:acc-err={pwdErr}>{pwdMsg}</div>
			{/if}
		</div>
		<button class="btn btn-secondary" onclick={changePassword} disabled={pwdSaving || !curPwd || !newPwd}>
			{pwdSaving ? 'Updating...' : 'Update Password'}
		</button>
	</div>

	<!-- ── Danger zone ───────────────────────────────────────────────── -->
	<div class="acc-section acc-danger-zone">
		<div class="acc-section-title"><AlertTriangle size={14} /> Danger Zone</div>
		{#if !delConfirm}
			<p class="acc-danger-desc">Permanently delete your account, all specimens, tribe memberships, and connections. This cannot be undone.</p>
			<button class="btn btn-danger" onclick={() => delConfirm = true}>Delete My Account</button>
		{:else}
			<p class="acc-danger-desc">Enter your password to confirm permanent deletion.</p>
			<div class="plan-field" style="margin-bottom:12px">
				<label class="form-label" for="acc-del">Password confirmation</label>
				<input id="acc-del" class="form-control" type="password" bind:value={delPwd} />
			</div>
			<div style="display:flex;gap:8px">
				<button class="btn btn-secondary" onclick={() => { delConfirm = false; delPwd = ''; }}>Cancel</button>
				<button class="btn btn-danger" onclick={deleteAccount} disabled={delSaving || !delPwd}>
					{delSaving ? 'Deleting...' : 'Permanently Delete'}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
.acc-page { max-width:560px; display:flex; flex-direction:column; gap:14px; }
.acc-header { display:flex; align-items:center; gap:16px; margin-bottom:8px; }
.acc-header .btn { flex-shrink:0; display:flex; align-items:center; gap:6px; }

.acc-section { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:20px 22px; clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%); display:flex; flex-direction:column; gap:14px; }
.acc-danger-zone { background:linear-gradient(160deg,rgba(20,8,8,0.97),rgba(10,4,4,1)); }

.acc-section-title { font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#475569; display:flex; align-items:center; gap:7px; }
.acc-fields { display:flex; flex-direction:column; gap:10px; }
.acc-discord-note { font-size:0.76rem; color:#5865f2; }
.acc-discord-note strong { color:#7c8cfc; }

.acc-msg { font-size:0.8rem; padding:8px 12px; background:rgba(34,197,94,0.08); border-left:2px solid #22c55e; color:#4ade80; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.acc-msg.acc-err { background:rgba(239,68,68,0.08); border-left-color:#ef4444; color:#fca5a5; }

.acc-danger-desc { font-size:0.82rem; color:#64748b; line-height:1.55; }
</style>
