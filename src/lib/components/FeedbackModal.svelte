<!--
    FeedbackModal — in-app report-a-thing dialog.

    Replaces the old external GitHub Pages bounce. Lets authed survivors
    file a bug / feature request / question / other from anywhere in the app.
    Auto-attaches page URL + user identity + browser info so the recipient
    doesn't have to ask "where did this happen" or "who are you."

    Backed by /api/feedback which fires a Discord webhook on the server.

    Props:
        open      — controlled boolean (bind from parent)
        user      — { id, nickname, email } so the displayed "From" line
                    matches the server's auto-attached identity.
-->
<script lang="ts">
    type Severity = 'bug' | 'feature' | 'question' | 'other';

    type Props = {
        open: boolean;
        user: { id: number; nickname: string | null; email: string } | null;
    };
    let { open = $bindable(false), user }: Props = $props();

    let severity = $state<Severity>('bug');
    let title = $state('');
    let description = $state('');
    let submitting = $state(false);
    let result = $state<{ ok: boolean; message: string } | null>(null);

    // Page context captured at modal-open time so it reflects the page the
    // user was on when they hit "Report", not whatever page they navigate
    // to while the modal is open (which shouldn't happen but defensively).
    let capturedUrl = $state('');
    let capturedAt = $state('');

    function captureContext() {
        if (typeof window !== 'undefined') {
            capturedUrl = window.location.pathname + window.location.search;
            capturedAt = new Date().toLocaleString();
        }
    }

    // Pull severity off the URL fragment if the trigger button sets one
    // (lets us deep-link to "report bug on this page" from anywhere later).
    $effect(() => {
        if (open) {
            captureContext();
            result = null;
        }
    });

    function close() {
        if (submitting) return;
        open = false;
        // Reset for next open
        setTimeout(() => {
            severity = 'bug';
            title = '';
            description = '';
            result = null;
        }, 200);
    }

    async function submit() {
        if (!title.trim() || !description.trim()) {
            result = { ok: false, message: 'Title and description required.' };
            return;
        }
        submitting = true;
        result = null;
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    severity,
                    title: title.trim(),
                    description: description.trim(),
                    pageUrl: capturedUrl,
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
                })
            });
            if (res.ok) {
                result = { ok: true, message: '✓ Sent — thanks for the report.' };
                // Auto-close after a moment so the user sees the confirmation
                setTimeout(close, 1400);
            } else {
                const body = await res.json().catch(() => ({}));
                result = { ok: false, message: body?.error ?? 'Failed to send. Please try again.' };
            }
        } catch {
            result = { ok: false, message: 'Network error. Please try again.' };
        } finally {
            submitting = false;
        }
    }

    const displayName = $derived(user?.nickname ?? user?.email ?? 'Survivor');
</script>

{#if open}
    <div class="fm-overlay" onclick={close} role="presentation">
        <div class="fm-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="fm-title">
            <header class="fm-head">
                <span class="fm-pip"></span>
                <h2 class="fm-title" id="fm-title">Report Issue</h2>
                <button class="fm-close" onclick={close} aria-label="Close" type="button">×</button>
            </header>

            <div class="fm-body">

                <!-- Severity -->
                <div class="fm-field">
                    <label class="fm-label" for="fm-severity">Type</label>
                    <div class="fm-severity-row">
                        <button type="button" class="fm-sev" class:active={severity === 'bug'} onclick={() => severity = 'bug'}>
                            <span class="dot bug"></span>Bug
                        </button>
                        <button type="button" class="fm-sev" class:active={severity === 'feature'} onclick={() => severity = 'feature'}>
                            <span class="dot feature"></span>Feature
                        </button>
                        <button type="button" class="fm-sev" class:active={severity === 'question'} onclick={() => severity = 'question'}>
                            <span class="dot question"></span>Question
                        </button>
                        <button type="button" class="fm-sev" class:active={severity === 'other'} onclick={() => severity = 'other'}>
                            <span class="dot other"></span>Other
                        </button>
                    </div>
                </div>

                <!-- Title -->
                <div class="fm-field">
                    <label class="fm-label" for="fm-title-input">Title</label>
                    <input
                        id="fm-title-input"
                        class="fm-input"
                        type="text"
                        bind:value={title}
                        placeholder="One-line summary..."
                        maxlength={120}
                        disabled={submitting}
                    />
                </div>

                <!-- Description -->
                <div class="fm-field">
                    <label class="fm-label" for="fm-desc">Description</label>
                    <textarea
                        id="fm-desc"
                        class="fm-textarea"
                        bind:value={description}
                        placeholder="What happened? What did you expect to happen? Any steps to reproduce?"
                        rows="6"
                        maxlength={2000}
                        disabled={submitting}
                    ></textarea>
                </div>

                <!-- Auto-attached context -->
                <div class="fm-context">
                    <div class="fm-context-label">Auto-attached</div>
                    <div class="fm-context-rows">
                        <div class="fm-context-row"><span class="k">From</span><span class="v">{displayName}</span></div>
                        <div class="fm-context-row"><span class="k">Page</span><span class="v">{capturedUrl || '—'}</span></div>
                        <div class="fm-context-row"><span class="k">Time</span><span class="v">{capturedAt || '—'}</span></div>
                    </div>
                </div>

                {#if result}
                    <div class="fm-result" class:error={!result.ok}>{result.message}</div>
                {/if}
            </div>

            <footer class="fm-foot">
                <button class="fm-btn ghost" onclick={close} disabled={submitting} type="button">Cancel</button>
                <button class="fm-btn solid" onclick={submit} disabled={submitting || !title.trim() || !description.trim()} type="button">
                    {submitting ? 'Sending…' : 'Send Report'}
                </button>
            </footer>
        </div>
    </div>
{/if}

<style>
.fm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 4, 12, 0.72);
    backdrop-filter: blur(6px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: fm-fade 0.15s ease-out;
}
@keyframes fm-fade { from { opacity: 0; } to { opacity: 1; } }

.fm-card {
    width: min(560px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    background: linear-gradient(160deg, rgba(10, 18, 44, 0.95) 0%, rgba(4, 8, 20, 0.98) 100%);
    border: 1px solid rgba(0, 180, 255, 0.30);
    box-shadow: 0 0 40px rgba(0, 180, 255, 0.20), inset 0 0 0 1px rgba(0, 180, 255, 0.06);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    display: flex;
    flex-direction: column;
}

.fm-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 22px 14px;
    border-bottom: 1px solid rgba(0, 180, 255, 0.12);
}
.fm-pip {
    width: 8px;
    height: 8px;
    background: var(--tek-blue);
    box-shadow: 0 0 8px var(--tek-blue-glow);
    border-radius: 50%;
}
.fm-title {
    font-family: var(--tek-display);
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--tek-blue);
    text-shadow: 0 0 8px var(--tek-blue-glow);
    margin: 0;
    flex: 1;
}
.fm-close {
    background: transparent;
    border: 1px solid rgba(100, 116, 139, 0.25);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 1.1rem;
    line-height: 1;
    width: 28px;
    height: 28px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.15s;
}
.fm-close:hover {
    color: var(--tek-text);
    border-color: rgba(239, 68, 68, 0.45);
}

.fm-body {
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.fm-field { display: flex; flex-direction: column; gap: 6px; }
.fm-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}

.fm-severity-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
}
.fm-sev {
    background: rgba(5, 8, 18, 0.65);
    border: 1px solid rgba(100, 116, 139, 0.22);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.10em;
    padding: 9px 8px;
    cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.15s;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    justify-content: center;
}
.fm-sev:hover { color: var(--tek-text); border-color: rgba(100, 116, 139, 0.45); }
.fm-sev.active {
    background: rgba(0, 180, 255, 0.10);
    border-color: var(--tek-blue);
    color: var(--tek-blue);
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.fm-sev .dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    display: inline-block;
}
.fm-sev .dot.bug      { background: #ef4444; box-shadow: 0 0 5px rgba(239,68,68,0.6); }
.fm-sev .dot.feature  { background: #00b4ff; box-shadow: 0 0 5px var(--tek-blue-glow); }
.fm-sev .dot.question { background: #fbbf24; box-shadow: 0 0 5px rgba(251,191,36,0.6); }
.fm-sev .dot.other    { background: #94a3b8; box-shadow: 0 0 5px rgba(148,163,184,0.5); }

.fm-input, .fm-textarea {
    background: rgba(5, 8, 18, 0.65);
    border: 1px solid rgba(100, 116, 139, 0.25);
    color: var(--tek-text);
    font-family: var(--tek-font);
    font-size: 0.88rem;
    padding: 10px 12px;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    resize: vertical;
    min-height: unset;
    line-height: 1.5;
}
.fm-input:focus, .fm-textarea:focus {
    border-color: var(--tek-blue);
    box-shadow: 0 0 0 1px var(--tek-blue);
}
.fm-textarea { font-family: var(--tek-font); min-height: 110px; }

.fm-context {
    background: rgba(100, 116, 139, 0.06);
    border: 1px dashed rgba(100, 116, 139, 0.20);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.fm-context-label {
    font-family: var(--tek-mono);
    font-size: 0.60rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 2px;
}
.fm-context-rows {
    display: grid;
    grid-template-columns: 60px 1fr;
    row-gap: 3px;
    column-gap: 12px;
}
.fm-context-row { display: contents; }
.fm-context-row .k {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.fm-context-row .v {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text-dim);
    word-break: break-word;
}

.fm-result {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.06em;
    color: var(--tek-blue);
    padding: 8px 12px;
    background: rgba(0, 180, 255, 0.08);
    border: 1px solid rgba(0, 180, 255, 0.30);
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
}
.fm-result.error {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.35);
}

.fm-foot {
    padding: 14px 22px 18px;
    border-top: 1px solid rgba(0, 180, 255, 0.10);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
.fm-btn {
    background: rgba(5, 8, 18, 0.7);
    border: 1px solid rgba(100, 116, 139, 0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    padding: 10px 18px;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.15s;
    text-transform: uppercase;
}
.fm-btn.ghost:hover {
    border-color: rgba(100, 116, 139, 0.45);
    color: var(--tek-text);
}
.fm-btn.solid {
    background: rgba(0, 180, 255, 0.16);
    border-color: var(--tek-blue);
    color: var(--tek-blue);
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.fm-btn.solid:hover:not(:disabled) {
    background: rgba(0, 180, 255, 0.24);
    box-shadow: 0 0 14px rgba(0, 180, 255, 0.30);
}
.fm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
