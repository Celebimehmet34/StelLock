<script lang="ts">
  import '../app.css';
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/store';
  import { onMount } from 'svelte';

  let { children } = $props();
  let copied = $state(false);

  onMount(() => {
    userStore.restore();
  });

  function logout() {
    userStore.logout();
    goto('/login');
  }

  async function copyKey() {
    await navigator.clipboard.writeText($userStore.publicKey);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="app-container">
  <nav class="glass-nav">
    <a href="/" class="logo-link">
      <div class="logo">EMANET <span class="badge">B2B Infrastructure</span></div>
    </a>

    <div class="nav-center">
      {#if $userStore.isLoggedIn}
        <a href="/">Home</a>
        <a href="/deposit">Deposit</a>
        <a href="/deliver">Deliver</a>
        <a href="/release">Release</a>
        <a href="/history">History</a>
        <a href="/zk" class="zk-link">🔬 ZK</a>
        <a href="/dispute" class="dispute-link">⚖️ Dispute</a>
      {:else}
        <a href="/register">Register</a>
        <a href="/login">Login</a>
      {/if}
    </div>

    <div class="nav-user">
      {#if $userStore.isLoggedIn}
        <div class="user-chip">
          <span class="user-name">{$userStore.username}</span>
          <span class="online-dot">●</span>
        </div>
        <button class="key-btn" onclick={copyKey} title="Copy your public key">
          {#if copied}
            ✅ Copied
          {:else}
            📋 {$userStore.publicKey.slice(0,4)}...{$userStore.publicKey.slice(-4)}
          {/if}
        </button>
        <button class="logout-btn" onclick={logout}>Logout</button>
      {:else}
        <a href="/register" class="cta-btn">Get Started →</a>
      {/if}
    </div>
  </nav>

  <main class="page-content">
    {@render children()}
  </main>
</div>

<style>
  .logo-link { text-decoration: none; }
  .nav-center { display: flex; gap: 2rem; }
  .nav-center a { color: var(--text-main); text-decoration: none; font-weight: 500; font-size: 0.95rem; transition: color 0.2s; }
  .nav-center a:hover { color: var(--secondary); }
  .dispute-link { color: #f0a500 !important; }
  .dispute-link:hover { color: #f44336 !important; }
  .zk-link { color: #66fcf1 !important; }
  .nav-user { display: flex; align-items: center; gap: 1rem; }
  .user-chip { display: flex; align-items: center; gap: 0.5rem; background: rgba(102,252,241,0.08); border: 1px solid rgba(102,252,241,0.2); border-radius: 20px; padding: 0.4rem 0.9rem; font-size: 0.82rem; }
  .user-name { color: var(--text-light); font-weight: 700; }
  .online-dot { color: #4caf50; font-size: 0.7rem; }
  .key-btn { background: rgba(102,252,241,0.07); border: 1px solid rgba(102,252,241,0.2); color: var(--secondary); padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.75rem; cursor: pointer; width: auto; margin: 0; font-weight: 600; box-shadow: none; text-transform: none; letter-spacing: 0; font-family: monospace; transition: all 0.2s; }
  .key-btn:hover { background: rgba(102,252,241,0.15); transform: none; }
  .logout-btn { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: var(--text-main); padding: 0.4rem 0.9rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer; width: auto; margin: 0; font-weight: 500; box-shadow: none; text-transform: none; letter-spacing: 0; transition: all 0.2s; }
  .logout-btn:hover { border-color: #f44336; color: #f44336; transform: none; }
  .cta-btn { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: var(--bg-color); padding: 0.5rem 1.2rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; text-decoration: none; }
</style>
