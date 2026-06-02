<script lang="ts">
  import { goto } from '$app/navigation';
  import { deriveKeypair, accountExists } from '$lib/utils/keypair';
  import { userStore } from '$lib/store';

  let role = $state<'buyer' | 'seller' | null>(null);
  let username = $state('');
  let password = $state('');
  let status = $state('');
  let loading = $state(false);

  async function handleLogin() {
    if (!role) { status = 'Select your role.'; return; }
    if (!username.trim() || !password) { status = 'Enter username and password.'; return; }

    try {
      loading = true;
      status = 'Deriving keypair...';

      const { publicKey, secretKey } = await deriveKeypair(username, password);

      status = 'Verifying account on Stellar testnet...';
      const exists = await accountExists(publicKey);

      if (!exists) {
        status = 'Account not found. Please register first.';
        loading = false;
        return;
      }

      userStore.login({ role, username, publicKey, secretKey });

      status = 'Logged in!';
      await new Promise(r => setTimeout(r, 500));
      goto(role === 'buyer' ? '/deposit' : '/deliver');

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

  <div class="role-picker">
    <button class="role-btn {role === 'buyer' ? 'active' : ''}" onclick={() => role = 'buyer'}>
      🔒 Buyer
    </button>
    <button class="role-btn {role === 'seller' ? 'active' : ''}" onclick={() => role = 'seller'}>
      📦 Seller
    </button>
  </div>

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

  <p class="register-link">No account? <a href="/register">Register →</a></p>
</div>

<style>
  .role-picker { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
  .role-btn {
    flex: 1; background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text-main); border-radius: 10px;
    padding: 0.9rem; font-size: 1rem; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    width: auto; margin-top: 0; box-shadow: none;
    text-transform: none; letter-spacing: 0;
  }
  .role-btn.active { border-color: var(--secondary); color: var(--secondary); background: rgba(102,252,241,0.1); }
  .register-link { text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-main); }
  .register-link a { color: var(--secondary); text-decoration: none; }
</style>
