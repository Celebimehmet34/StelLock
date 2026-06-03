<script lang="ts">
  import { goto } from '$app/navigation';
  import { deriveKeypair } from '$lib/utils/keypair';
  import { connectFreighter } from '$lib/stellar/wallet';
  import { userStore } from '$lib/store';

  let step = $state<'form' | 'verify'>('form');
  let username = $state('');
  let email = $state('');
  let password = $state('');
  let confirm = $state('');
  let status = $state('');
  let loading = $state(false);

  // verification
  let code = $state('');
  let devCode = $state('');
  let savedKeys = $state<{ publicKey: string; secretKey: string } | null>(null);

  async function handleRegister() {
    if (!username.trim()) { status = 'Enter a username.'; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { status = 'Enter a valid email.'; return; }
    if (password.length < 6) { status = 'Password must be at least 6 characters.'; return; }
    if (password !== confirm) { status = 'Passwords do not match.'; return; }

    try {
      loading = true;
      status = 'Deriving your Stellar keypair...';
      const keys = await deriveKeypair(username, password);
      savedKeys = keys;

      status = 'Sending verification code...';
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), publicKey: keys.publicKey })
      });

      if (!res.ok) {
        status = (res.status === 409 ? '' : 'Failed: ') + (await res.text());
        loading = false;
        return;
      }

      const data = await res.json();
      if (data.devCode) devCode = data.devCode; // demo mode
      step = 'verify';
      status = data.emailSent ? 'Verification code sent to your email.' : 'Demo mode: use the code shown below.';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }

  async function handleVerify() {
    if (!code.trim()) { status = 'Enter the verification code.'; return; }
    if (!savedKeys) { status = 'Session lost — please restart.'; step = 'form'; return; }

    try {
      loading = true;
      status = 'Verifying code...';
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), code: code.trim() })
      });

      if (!res.ok) {
        status = await res.text();
        loading = false;
        return;
      }

      userStore.login({ walletType: 'password', username: username.trim(), publicKey: savedKeys.publicKey, secretKey: savedKeys.secretKey });
      status = 'Verified! Account ready.';
      await new Promise(r => setTimeout(r, 500));
      goto('/');
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }

  async function handleFreighterRegister() {
    try {
      loading = true;
      status = 'Connecting to Freighter...';
      const wallet = await connectFreighter();
      userStore.login({
        walletType: 'freighter',
        username: 'freighter_' + wallet.publicKey.slice(0, 8),
        publicKey: wallet.publicKey,
        secretKey: ''
      });
      goto('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      status = msg === 'NOT_INSTALLED'
        ? '🦊 Freighter not detected. Install it at freighter.app, then refresh.'
        : 'Freighter error: ' + msg;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Register | Emanet</title></svelte:head>

<div class="glass-card">
  {#if step === 'form'}
    <h1>Create Account</h1>
    <p class="subtitle">Email-verified, password-based Stellar wallet</p>

    <button class="freighter-btn" onclick={handleFreighterRegister} disabled={loading}>
      <span class="freighter-icon">🦊</span> Connect Freighter Wallet
    </button>
    <p class="freighter-note">Non-custodial — no email needed.</p>
    <div class="divider"><span>or create a password wallet</span></div>

    <div class="form-group">
      <label for="username">Username</label>
      <input id="username" type="text" bind:value={username} placeholder="alice" autocomplete="off" />
    </div>

    <div class="form-group">
      <label for="email">Email</label>
      <input id="email" type="email" bind:value={email} placeholder="alice@example.com" autocomplete="off" />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input id="password" type="password" bind:value={password} placeholder="••••••••" />
    </div>

    <div class="form-group">
      <label for="confirm">Confirm Password</label>
      <input id="confirm" type="password" bind:value={confirm} placeholder="••••••••" />
    </div>

    <p class="warning">⚠️ Same username + password always regenerates the same wallet. No recovery.</p>

    <button onclick={handleRegister} disabled={loading}>
      {loading ? 'Processing...' : '🚀 Continue → Verify Email'}
    </button>

    <p class="link-row">Already have an account? <a href="/login">Log in →</a></p>

  {:else}
    <h1>Verify Email</h1>
    <p class="subtitle">Enter the 6-digit code sent to {email}</p>

    {#if devCode}
      <div class="dev-code-box">
        <span class="dev-label">DEMO MODE — your code:</span>
        <span class="dev-code">{devCode}</span>
      </div>
    {/if}

    <div class="form-group">
      <label for="code">Verification Code</label>
      <input id="code" type="text" bind:value={code} placeholder="123456" maxlength="6" style="font-size:1.5rem; letter-spacing:8px; text-align:center;" />
    </div>

    <button onclick={handleVerify} disabled={loading}>
      {loading ? 'Verifying...' : '✅ Verify & Create Account'}
    </button>

    <button class="back-btn" onclick={() => { step = 'form'; status = ''; }}>← Back</button>
  {/if}

  {#if status}
    <div class="status-box"><strong>Status:</strong> {status}</div>
  {/if}
</div>

<style>
  .freighter-btn { width:100%; padding:1rem; background:linear-gradient(135deg,#8b5cf6,#6d28d9); border:none; border-radius:12px; color:white; font-size:1.05rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.6rem; margin-bottom:0.3rem; box-shadow:0 8px 20px -8px rgba(139,92,246,0.5); }
  .freighter-btn:hover { opacity:0.9; transform:translateY(-2px); }
  .freighter-icon { font-size:1.3rem; }
  .freighter-note { font-size:0.75rem; color:#8b5cf6; text-align:center; margin:0.3rem 0 0; }
  .divider { display:flex; align-items:center; gap:1rem; margin:1.5rem 0; }
  .divider::before, .divider::after { content:''; flex:1; height:1px; background:var(--glass-border); }
  .divider span { font-size:0.78rem; color:var(--text-main); white-space:nowrap; }
  .warning { font-size:0.78rem; color:#f0a500; margin-bottom:1rem; line-height:1.5; }
  .link-row { text-align:center; margin-top:1.5rem; font-size:0.85rem; color:var(--text-main); }
  .link-row a { color:var(--secondary); text-decoration:none; }
  .dev-code-box { background:rgba(240,165,0,0.1); border:1px dashed rgba(240,165,0,0.4); border-radius:10px; padding:1rem; margin-bottom:1.5rem; text-align:center; }
  .dev-label { display:block; font-size:0.7rem; color:#f0a500; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.4rem; }
  .dev-code { font-size:1.8rem; font-weight:800; letter-spacing:6px; color:var(--text-light); font-family:monospace; }
  .back-btn { background:transparent; border:1px solid rgba(255,255,255,0.15); color:var(--text-main); margin-top:0.8rem; box-shadow:none; text-transform:none; letter-spacing:0; }
  .back-btn:hover { transform:none; border-color:var(--secondary); }
</style>
