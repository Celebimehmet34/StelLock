<script lang="ts">
  import { goto } from '$app/navigation';
  import { deriveKeypair, accountExists, friendbotFund } from '$lib/utils/keypair';
  import { userStore } from '$lib/store';

  let username = $state('');
  let password = $state('');
  let confirm = $state('');
  let status = $state('');
  let loading = $state(false);

  async function handleRegister() {
    if (!username.trim()) { status = 'Enter a username.'; return; }
    if (password.length < 6) { status = 'Password must be at least 6 characters.'; return; }
    if (password !== confirm) { status = 'Passwords do not match.'; return; }

    try {
      loading = true;
      status = 'Deriving your Stellar keypair...';
      const { publicKey, secretKey } = await deriveKeypair(username, password);

      const exists = await accountExists(publicKey);
      if (!exists) {
        status = 'Funding your testnet account via Friendbot...';
        await friendbotFund(publicKey);
        await new Promise(r => setTimeout(r, 3000));
      }

      userStore.login({ username, publicKey, secretKey });
      status = 'Account ready!';
      await new Promise(r => setTimeout(r, 600));
      goto('/deposit');
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Register | Emanet</title></svelte:head>

<div class="glass-card">
  <h1>Create Account</h1>
  <p class="subtitle">Username + password = your Stellar wallet. No seed phrase.</p>

  <div class="form-group">
    <label for="username">Username</label>
    <input id="username" type="text" bind:value={username} placeholder="alice" autocomplete="off" />
  </div>

  <div class="form-group">
    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} placeholder="••••••••" />
  </div>

  <div class="form-group">
    <label for="confirm">Confirm Password</label>
    <input id="confirm" type="password" bind:value={confirm} placeholder="••••••••" />
  </div>

  <p class="warning">⚠️ Same username + password always generates the same wallet. Don't forget them — there's no recovery.</p>

  <button onclick={handleRegister} disabled={loading}>
    {loading ? 'Creating account...' : '🚀 Create Account'}
  </button>

  {#if status}
    <div class="status-box"><strong>Status:</strong> {status}</div>
  {/if}

  <p class="link-row">Already have an account? <a href="/login">Log in →</a></p>
</div>

<style>
  .warning { font-size: 0.78rem; color: #f0a500; margin-bottom: 1rem; line-height: 1.5; }
  .link-row { text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-main); }
  .link-row a { color: var(--secondary); text-decoration: none; }
</style>
