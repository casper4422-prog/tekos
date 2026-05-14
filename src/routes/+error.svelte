<script lang="ts">
    import { page } from '$app/stores';
</script>

<div class="error-stage">
    <div class="error-panel">
        <div class="error-code">{$page.status}</div>
        <div class="error-msg">{$page.error?.message ?? 'Something went wrong'}</div>
        <a class="error-link" href="/dossier">Return to Dossier ▸</a>
    </div>
</div>

<style>
.error-stage {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--tek-bg, #050812);
    font-family: var(--tek-font, 'Inter', system-ui, sans-serif);
}
.error-panel {
    text-align: center;
    padding: 48px 32px;
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.96) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    max-width: 440px;
    width: 100%;
}
.error-code {
    font-family: var(--tek-mono, 'JetBrains Mono', monospace);
    font-size: 5rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1;
    margin-bottom: 16px;
}
.error-msg {
    font-size: 0.9rem;
    color: var(--tek-text-dim, #64748b);
    letter-spacing: 0.06em;
    margin-bottom: 28px;
    text-transform: uppercase;
}
.error-link {
    display: inline-block;
    font-family: var(--tek-mono, monospace);
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--tek-blue, #00b4ff);
    text-decoration: none;
    border: 1px solid rgba(0,180,255,0.3);
    padding: 10px 20px;
    transition: border-color 0.2s, color 0.2s;
}
.error-link:hover {
    border-color: rgba(0,180,255,0.7);
    color: #00d4ff;
}
</style>
