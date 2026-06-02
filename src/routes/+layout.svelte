<script lang="ts">
  import '../app.css';
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/store';
  import { onMount } from 'svelte';

  onMount(() => {
    userStore.restorePublicInfo();
  });

  function logout() {
    userStore.logout();
    goto('/login');
  }
</script>

<div class="app-container">
  <nav class="glass-nav">
    <a href="/" class="logo-link">
      <div class="logo">EMANET <span class="badge">B2B Infrastructure</span></div>
    </a>

    <div class="nav-center">
      {#if $userStore.isLoggedIn}
        {#if $userStore.role === 'buyer'}
          <a href="/deposit">1. Deposit</a>
          <a href="/release">3. Release</a>
        {:else if $userStore.role === 'seller'}
          <a href="/deliver">2. Deliver</a>
        {/if}
      {:else}
        <a href="/register">Register</a>
        <a href="/login">Login</a>
      {/if}
    </div>

    <div class="nav-user">
      {#if $userStore.isLoggedIn}
        <div class="user-chip">
          <span class="user-role-icon">{$userStore.role === 'buyer' ? '🔒' : '📦'}</span>
          <span class="user-name">{$userStore.username}</span>
          <span class="user-role">({$userStore.role})</span>
          <span class="online-dot">●</span>
        </div>
        <button class="logout-btn" onclick={logout}>Logout</button>
      {:else}
        <a href="/register" class="cta-btn">Get Started →</a>
      {/if}
    </div>
  </nav>

  <main class="page-content">
    <slot />
  </main>
</div>

<style>
  .logo-link { text-decoration: none; }

  .nav-center {
    display: flex;
    gap: 2rem;
  }

  .nav-center a {
    color: var(--text-main);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s;
  }

  .nav-center a:hover { color: var(--secondary); }

  .nav-user {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-chip {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(102,252,241,0.08);
    border: 1px solid rgba(102,252,241,0.2);
    border-radius: 20px;
    padding: 0.4rem 0.9rem;
    font-size: 0.82rem;
  }

  .user-name { color: var(--text-light); font-weight: 700; }
  .user-role { color: var(--text-main); }
  .online-dot { color: #4caf50; font-size: 0.7rem; }

  .logout-btn {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.15);
    color: var(--text-main);
    padding: 0.4rem 0.9rem;
    border-radius: 8px;
    font-size: 0.8rem;
    cursor: pointer;
    width: auto;
    margin: 0;
    font-weight: 500;
    box-shadow: none;
    text-transform: none;
    letter-spacing: 0;
    transition: all 0.2s;
  }

  .logout-btn:hover {
    border-color: #f44336;
    color: #f44336;
    transform: none;
  }

  .cta-btn {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: var(--bg-color);
    padding: 0.5rem 1.2rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    text-decoration: none;
    transition: opacity 0.2s;
  }

  .cta-btn:hover { opacity: 0.85; }
</style>
