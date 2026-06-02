<script lang="ts">
  import { goto } from '$app/navigation';
  import { deriveKeypair, accountExists, friendbotFund } from '$lib/utils/keypair';
  import { userStore } from '$lib/store';

  let role = $state<'buyer' | 'seller' | null>(null);
  let username = $state('');
  let password = $state('');
  let confirm = $state('');
  let status = $state('');
  let loading = $state(false);

  async function handleRegister() {
    if (!role) { status = 'Please select your role.'; return; }
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

      status = 'Account ready!';

      userStore.login({ role, username, publicKey, secretKey });

      await new Promise(r => setTimeout(r, 800));
      goto(role === 'buyer' ? '/deposit' : '/deliver');

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
  <p class="subtitle">Your username + password = your Stellar wallet</p>

  <div class="role-picker">
    <button
      class="role-btn {role === 'buyer' ? 'active' : ''}"
      onclick={() => role = 'buyer'}>
      🔒 Buyer
    </button>
    <button
      class="role-btn {role === 'seller' ? 'active' : ''}"
      onclick={() => role = 'seller'}>
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

  <div class="form-group">
    <label for="confirm">Confirm Password</label>
    <input id="confirm" type="password" bind:value={confirm} placeholder="••••••••" />
  </div>

  <p class="warning">⚠️ Same username + password always generates the same wallet. Don't forget them.</p>

  <button onclick={handleRegister} disabled={loading}>
    {loading ? 'Creating account...' : '🚀 Create Account'}
  </button>

  {#if status}
    <div class="status-box"><strong>Status:</strong> {status}</div>
  {/if}

  <p class="login-link">Already have an account? <a href="/login">Log in →</a></p>
</div>

<style>
  .role-picker {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .role-btn {
    flex: 1;
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text-main);
    border-radius: 10px;
    padding: 0.9rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: auto;
    margin-top: 0;
    box-shadow: none;
    text-transform: none;
    letter-spacing: 0;
  }
  .role-btn.active {
    border-color: var(--secondary);
    color: var(--secondary);
    background: rgba(102,252,241,0.1);
  }
  .warning {
    font-size: 0.78rem;
    color: #f0a500;
    margin-bottom: 1rem;
    line-height: 1.4;
  }
  .login-link {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.85rem;
    color: var(--text-main);
  }
  .login-link a { color: var(--secondary); text-decoration: none; }
</style>
