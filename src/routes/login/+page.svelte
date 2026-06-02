<script lang="ts">
  import { goto } from '$app/navigation';
  import { deriveKeypair } from '$lib/utils/keypair';
  import { isFreighterAvailable, connectFreighter } from '$lib/stellar/wallet';
  import { userStore } from '$lib/store';
  import { onMount } from 'svelte';

  let username = $state('');
  let password = $state('');
  let status = $state('');
  let loading = $state(false);
  let freighterAvailable = $state(false);

  onMount(async () => {
    freighterAvailable = await isFreighterAvailable();
  });

  async function handlePasswordLogin() {
    if (!username.trim() || !password) { status = 'Enter username and password.'; return; }
    try {
      loading = true;
      status = 'Deriving keypair...';
      const { publicKey, secretKey } = await deriveKeypair(username, password);

      status = 'Verifying credentials...';
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), publicKey })
      });

      if (!res.ok) {
        if (res.status === 404) status = 'No account with that username. Please register first.';
        else if (res.status === 401) status = 'Incorrect password.';
        else status = 'Login failed: ' + (await res.text());
        loading = false;
        return;
      }

      userStore.login({ walletType: 'password', username: username.trim(), publicKey, secretKey });
      goto('/');
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }

  async function handleFreighterLogin() {
    try {
      loading = true;
      status = 'Connecting to Freighter...';

      const wallet = await connectFreighter();

      // Use truncated public key as username for Freighter users
      const freighterUsername = 'freighter_' + wallet.publicKey.slice(0, 8);

      userStore.login({
        walletType: 'freighter',
        username: freighterUsername,
        publicKey: wallet.publicKey,
        secretKey: '' // Freighter signs internally — no secret needed
      });

      status = 'Connected!';
      goto('/');
    } catch (e) {
      status = 'Freighter error: ' + (e instanceof Error ? e.message : e);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Login | Emanet</title></svelte:head>

<div class="glass-card">
  <h1>Log In</h1>
  <p class="subtitle">Choose your wallet</p>

  {#if freighterAvailable}
    <button class="freighter-btn" onclick={handleFreighterLogin} disabled={loading}>
      <span class="freighter-icon">🦊</span> Connect Freighter Wallet
    </button>
    <div class="divider"><span>or use password</span></div>
  {:else}
    <div class="freighter-hint">
      💡 Install <a href="https://freighter.app" target="_blank">Freighter</a> for non-custodial wallet signing.
    </div>
  {/if}

  <div class="form-group">
    <label for="username">Username</label>
    <input id="username" type="text" bind:value={username} placeholder="alice" autocomplete="off" />
  </div>

  <div class="form-group">
    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} placeholder="••••••••" />
  </div>

  <button onclick={handlePasswordLogin} disabled={loading}>
    {loading ? 'Logging in...' : '→ Log In with Password'}
  </button>

  {#if status}
    <div class="status-box"><strong>Status:</strong> {status}</div>
  {/if}

  <p class="link-row">No account? <a href="/register">Register →</a></p>
</div>

<style>
  .freighter-btn { width:100%; padding:1rem; background:linear-gradient(135deg,#8b5cf6,#6d28d9); border:none; border-radius:12px; color:white; font-size:1.05rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.6rem; margin-bottom:0; transition:opacity 0.2s; box-shadow:0 8px 20px -8px rgba(139,92,246,0.5); }
  .freighter-btn:hover { opacity:0.9; transform:translateY(-2px); }
  .freighter-icon { font-size:1.3rem; }
  .divider { display:flex; align-items:center; gap:1rem; margin:1.5rem 0; }
  .divider::before, .divider::after { content:''; flex:1; height:1px; background:var(--glass-border); }
  .divider span { font-size:0.78rem; color:var(--text-main); white-space:nowrap; }
  .freighter-hint { background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.2); border-radius:10px; padding:0.7rem 1rem; margin-bottom:1.5rem; font-size:0.8rem; color:var(--text-main); }
  .freighter-hint a { color:#8b5cf6; text-decoration:none; font-weight:600; }
  .link-row { text-align:center; margin-top:1.5rem; font-size:0.85rem; color:var(--text-main); }
  .link-row a { color:var(--secondary); text-decoration:none; }
</style>
