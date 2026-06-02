<script lang="ts">
  import { goto } from '$app/navigation';
  import { deriveKeypair } from '$lib/utils/keypair';
  import { userStore } from '$lib/store';

  let username = $state('');
  let password = $state('');
  let status = $state('');
  let loading = $state(false);

  async function handleLogin() {
    if (!username.trim() || !password) { status = 'Enter username and password.'; return; }

    try {
      loading = true;
      status = 'Deriving keypair...';

      const { publicKey, secretKey } = await deriveKeypair(username, password);

      userStore.login({ username, publicKey, secretKey });

      status = 'Logged in!';
      await new Promise(r => setTimeout(r, 300));
      goto('/deposit');
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Login | Emanet</title></svelte:head>

<div class="glass-card">
  <h1>Log In</h1>
  <p class="subtitle">Enter your credentials to restore your wallet</p>

  <div class="form-group">
    <label for="username">Username</label>
    <input id="username" type="text" bind:value={username} placeholder="alice" autocomplete="off" />
  </div>

  <div class="form-group">
    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} placeholder="••••••••" />
  </div>

  <button onclick={handleLogin} disabled={loading}>
    {loading ? 'Logging in...' : '→ Log In'}
  </button>

  {#if status}
    <div class="status-box"><strong>Status:</strong> {status}</div>
  {/if}

  <p class="link-row">No account? <a href="/register">Register →</a></p>
</div>

<style>
  .link-row { text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-main); }
  .link-row a { color: var(--secondary); text-decoration: none; }
</style>
