<script lang="ts">
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let showRegister = $state(false);
	let regNickname = $state('');

	async function login(e: Event) {
		e.preventDefault();
		loading = true; error = '';
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ identifier: email, password })
		});
		const body = await res.json();
		if (res.ok) window.location.href = '/dossier';
		else { error = body.error ?? 'Login failed'; loading = false; }
	}

	async function register(e: Event) {
		e.preventDefault();
		loading = true; error = '';
		const res = await fetch('/api/auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, nickname: regNickname })
		});
		const body = await res.json();
		if (res.ok) window.location.href = '/dossier';
		else { error = body.error ?? 'Registration failed'; loading = false; }
	}

	function discordLogin() {
		window.location.href = '/api/auth/discord/start';
	}
</script>

<div id="tekLoginWrap">
	<div class="tek-login-panel">
		<div class="tek-login-logo">
			<div class="tek-login-hex">⬡</div>
			<div class="tek-login-title">TekOS</div>
			<div class="tek-login-sub">Specimen Management Network</div>
		</div>

		{#if !showRegister}
			<form onsubmit={login}>
				<div class="tek-form-group">
					<label class="tek-form-label" for="loginEmail">Identifier</label>
					<input class="tek-form-input" id="loginEmail" type="text" bind:value={email} required autocomplete="username" placeholder="Email or nickname" />
				</div>
				<div class="tek-form-group">
					<label class="tek-form-label" for="loginPassword">Access Key</label>
					<input class="tek-form-input" id="loginPassword" type="password" bind:value={password} required autocomplete="current-password" />
				</div>
				<button type="submit" class="tek-connect-btn" disabled={loading}>
					{loading ? 'Connecting...' : 'Establish Connection'}
				</button>
			</form>

			<div class="tek-login-divider"><span>or</span></div>

			<button class="tek-discord-btn" onclick={discordLogin}>
				<svg width="18" height="18" viewBox="0 0 71 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
					<path d="M60.1 4.9A58.6 58.6 0 0045.6.5a.2.2 0 00-.2.1 40.9 40.9 0 00-1.8 3.7 54.1 54.1 0 00-16.3 0 37.2 37.2 0 00-1.9-3.7.2.2 0 00-.2-.1A58.4 58.4 0 0010.6 4.9a.2.2 0 00-.1.1C1.5 18.4-.9 31.5.3 44.5a.2.2 0 00.1.1 58.9 58.9 0 0017.7 9 .2.2 0 00.2-.1 42.1 42.1 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 010-.4l1.1-.8a.2.2 0 01.2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 01.2 0l1.1.8a.2.2 0 010 .4 36.1 36.1 0 01-5.6 2.6.2.2 0 00-.1.3 47.3 47.3 0 003.6 5.9.2.2 0 00.2.1A58.7 58.7 0 0070.6 44.6a.2.2 0 00.1-.1c1.4-14.9-2.4-27.9-10.5-39.5a.2.2 0 00-.1-.1zM23.7 36.7c-3.5 0-6.4-3.2-6.4-7.2s2.9-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.3 6.4 7.2 0 3.9-2.9 7.2-6.4 7.2z"/>
				</svg>
				Continue with Discord
			</button>

			<div class="tek-login-footer">
				No account? <button class="tek-link-btn" onclick={() => showRegister = true}>Request Access</button>
			</div>
		{:else}
			<form onsubmit={register}>
				<div class="tek-form-group">
					<label class="tek-form-label" for="regEmail">Email</label>
					<input class="tek-form-input" id="regEmail" type="email" bind:value={email} required autocomplete="email" />
				</div>
				<div class="tek-form-group">
					<label class="tek-form-label" for="regNick">Callsign (nickname)</label>
					<input class="tek-form-input" id="regNick" type="text" bind:value={regNickname} placeholder="Optional" autocomplete="nickname" />
				</div>
				<div class="tek-form-group">
					<label class="tek-form-label" for="regPassword">Access Key</label>
					<input class="tek-form-input" id="regPassword" type="password" bind:value={password} required autocomplete="new-password" />
				</div>
				<button type="submit" class="tek-connect-btn" disabled={loading}>
					{loading ? 'Creating...' : 'Create Account'}
				</button>
			</form>
			<div class="tek-login-footer">
				Already have access? <button class="tek-link-btn" onclick={() => showRegister = false}>Sign In</button>
			</div>
		{/if}

		{#if error}
			<div class="tek-login-error" role="alert">{error}</div>
		{/if}
	</div>
</div>
