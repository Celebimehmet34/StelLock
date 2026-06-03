<script lang="ts">
  import { userStore, historyStore } from '$lib/store';
  import { derived } from 'svelte/store';
  import { onMount } from 'svelte';

  let copied = $state(false);
  let xlmBalance = $state<string | null>(null);
  let funded = $state(true);
  let price = $state<{ xlm_usd: number | null; xlm_eur: number | null; xlm_try: number | null } | null>(null);

  async function copyKey() {
    await navigator.clipboard.writeText($userStore.publicKey);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  async function loadBalance() {
    if (!$userStore.publicKey) return;
    try {
      const res = await fetch('/api/balance/' + $userStore.publicKey);
      if (res.ok) {
        const d = await res.json();
        xlmBalance = parseFloat(d.xlm).toFixed(4);
        funded = d.funded;
      }
    } catch {}
  }

  async function loadPrice() {
    try { const r = await fetch('/api/price'); if (r.ok) price = await r.json(); } catch {}
  }

  onMount(() => {
    if ($userStore.isLoggedIn) {
      historyStore.load($userStore.publicKey);
      loadBalance();
      loadPrice();
    }
  });

  // USD value of XLM balance
  const balanceUsd = $derived(
    xlmBalance && price?.xlm_usd ? (parseFloat(xlmBalance) * price.xlm_usd).toFixed(2) : null
  );

  // Derive stats from history
  const stats = derived(historyStore, ($h) => {
    const deposits = $h.filter(t => t.type === 'deposit').length;
    const delivers = $h.filter(t => t.type === 'deliver').length;
    const releases = $h.filter(t => t.type === 'release').length;
    const totalAmount = $h
      .filter(t => t.type === 'deposit' && t.meta?.amount)
      .reduce((sum, t) => sum + parseFloat(t.meta!.amount!), 0);
    return { deposits, delivers, releases, total: $h.length, totalAmount };
  });

  // Recent escrows for quick access
  const recentEscrows = derived(historyStore, ($h) => {
    const seen = new Set<string>();
    return $h.filter(t => {
      if (seen.has(t.escrowId)) return false;
      seen.add(t.escrowId);
      return true;
    }).slice(0, 5);
  });

  const actions = [
    { title: 'Deposit', icon: '🔒', href: '/deposit', desc: 'Lock funds with ZK proof + AES encryption.' },
    { title: 'Deliver', icon: '📦', href: '/deliver', desc: 'Submit work to IPFS with cryptographic proof.' },
    { title: 'Release', icon: '✅', href: '/release', desc: 'Verify delivery and release payment.' },
    { title: 'ZK Proof', icon: '🔬', href: '/zk', desc: 'Interactive Groth16 zero-knowledge demo.' }
  ];

  const features = [
    { label: 'Verifiable Delivery', desc: 'IPFS + SHA-256 hash on-chain' },
    { label: 'Privacy Layer', desc: 'AES-256-GCM + Groth16 zk-SNARK' },
    { label: 'No Seed Phrases', desc: 'Username + password wallet' },
    { label: 'Infrastructure for Trustless Work', desc: 'Battle-tested Soroban escrow' }
  ];
</script>

<svelte:head>
  <title>Stellock — Verifiable Delivery Infrastructure</title>
</svelte:head>

{#if $userStore.isLoggedIn}
  <div class="dash">
    <div class="dash-head">
      <div>
        <div class="welcome">Welcome back,</div>
        <h1 class="username">{$userStore.username}</h1>
      </div>
      <button class="key-chip" onclick={copyKey} title="Copy your public key">
        {#if copied}✅ Copied{:else}📋 {$userStore.publicKey.slice(0,6)}…{$userStore.publicKey.slice(-6)}{/if}
      </button>
    </div>

    <!-- Balance + Exchange rate -->
    <div class="balance-card">
      <div class="bal-main">
        <div class="bal-label">Wallet Balance</div>
        <div class="bal-amount">
          {#if xlmBalance === null}…{:else}{xlmBalance} <span class="bal-unit">XLM</span>{/if}
        </div>
        {#if balanceUsd}<div class="bal-usd">≈ ${balanceUsd} USD</div>{/if}
        {#if xlmBalance !== null && !funded}<div class="bal-warn">Not funded yet</div>{/if}
      </div>
      <div class="bal-rates">
        <div class="rate-title">📡 Reflector Oracle</div>
        {#if price?.xlm_usd}
          <div class="rate-row"><span>XLM/USD</span><strong>${price.xlm_usd.toFixed(4)}</strong></div>
          <div class="rate-row"><span>XLM/EUR</span><strong>€{price.xlm_eur?.toFixed(4)}</strong></div>
          <div class="rate-row"><span>XLM/TRY</span><strong>₺{price.xlm_try?.toFixed(2)}</strong></div>
        {:else}
          <div class="rate-row"><span>Loading rates…</span></div>
        {/if}
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-num">{$stats.total}</div>
        <div class="stat-label">Transactions</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{$stats.deposits}</div>
        <div class="stat-label">Deposits</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{$stats.delivers}</div>
        <div class="stat-label">Deliveries</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{$stats.releases}</div>
        <div class="stat-label">Releases</div>
      </div>
    </div>

    <!-- Recent Escrows -->
    {#if $recentEscrows.length > 0}
      <div class="recent-section">
        <div class="section-title">Recent Escrows</div>
        {#each $recentEscrows as esc}
          <a href="/escrow/{esc.escrowId}" class="recent-row">
            <span class="recent-type">{esc.type === 'deposit' ? '🔒' : esc.type === 'deliver' ? '📦' : '✅'}</span>
            <span class="recent-id">{esc.escrowId}</span>
            <span class="recent-meta">{esc.meta?.amount ? esc.meta.amount + ' USDC' : esc.type}</span>
            <span class="recent-arrow">→</span>
          </a>
        {/each}
        <a href="/history" class="view-all">View all →</a>
      </div>
    {/if}

    <p class="dash-hint">Share your public key with a buyer to receive an escrow, or start one yourself:</p>

    <div class="action-grid">
      {#each actions as a}
        <a href={a.href} class="action-card">
          <div class="action-icon">{a.icon}</div>
          <div class="action-title">{a.title}</div>
          <div class="action-desc">{a.desc}</div>
          <div class="action-cta">Open →</div>
        </a>
      {/each}
    </div>
  </div>
{:else}
  <div class="hero">
    <div class="hero-content">
      <div class="hero-badge">Infrastructure for Trustless Work · Stellar · Soroban</div>
      <h1 class="hero-title">
        Proof of delivery.<br/>
        <span class="accent">Not promise of delivery.</span>
      </h1>
      <p class="hero-subtitle">
        Verifiable delivery, commercial privacy (AES + zk-SNARK), and seedless wallets
        on top of Stellar's battle-tested escrow infrastructure.
      </p>

      <div class="cta-row">
        <a href="/register" class="cta-primary">🚀 Create Account</a>
        <a href="/login" class="cta-secondary">Log In →</a>
      </div>
    </div>

    <div class="features-bar">
      {#each features as f}
        <div class="feature-item">
          <div class="feature-label">{f.label}</div>
          <div class="feature-desc">{f.desc}</div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .dash { max-width:880px; margin:0 auto; padding:2rem; width:100%; box-sizing:border-box; }
  .dash-head { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap; }
  .welcome { color:var(--text-main); font-size:0.9rem; }
  .username { color:var(--text-light); font-size:2.2rem; margin:0.2rem 0 0; font-weight:800; }
  .key-chip { background:rgba(102,252,241,0.08); border:1px solid rgba(102,252,241,0.25); color:var(--secondary); padding:0.5rem 1rem; border-radius:10px; font-family:monospace; font-size:0.82rem; font-weight:600; cursor:pointer; width:auto; margin:0; box-shadow:none; text-transform:none; letter-spacing:0; }
  .key-chip:hover { background:rgba(102,252,241,0.16); transform:none; }
  .dash-hint { color:var(--text-main); font-size:0.85rem; margin:1.2rem 0 1.5rem; }

  .balance-card { display:grid; grid-template-columns:1.4fr 1fr; gap:1rem; margin:1.5rem 0; }
  .bal-main { background:linear-gradient(135deg,rgba(69,162,158,0.15),rgba(102,252,241,0.08)); border:1px solid rgba(102,252,241,0.25); border-radius:16px; padding:1.4rem; }
  .bal-label { font-size:0.72rem; text-transform:uppercase; letter-spacing:0.5px; color:var(--primary); font-weight:700; }
  .bal-amount { font-size:2.2rem; font-weight:800; color:var(--text-light); margin-top:0.3rem; }
  .bal-unit { font-size:1rem; color:var(--secondary); font-weight:600; }
  .bal-usd { font-size:0.9rem; color:var(--text-main); margin-top:0.2rem; }
  .bal-warn { font-size:0.78rem; color:#f0a500; margin-top:0.4rem; }
  .bal-rates { background:var(--panel-bg); border:1px solid var(--glass-border); border-radius:16px; padding:1.2rem; }
  .rate-title { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; color:var(--primary); font-weight:700; margin-bottom:0.6rem; }
  .rate-row { display:flex; justify-content:space-between; font-size:0.82rem; padding:0.25rem 0; color:var(--text-main); }
  .rate-row strong { color:var(--secondary); }
  .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:0.8rem; margin:1.5rem 0; }
  .stat-card { background:var(--panel-bg); border:1px solid var(--glass-border); border-radius:12px; padding:1rem; text-align:center; }
  .stat-num { font-size:1.8rem; font-weight:800; color:var(--secondary); }
  .stat-label { font-size:0.7rem; color:var(--text-main); text-transform:uppercase; letter-spacing:0.5px; margin-top:0.2rem; }

  .recent-section { background:var(--panel-bg); border:1px solid var(--glass-border); border-radius:14px; padding:1rem; margin-bottom:1.5rem; }
  .section-title { font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; color:var(--primary); font-weight:700; margin-bottom:0.6rem; }
  .recent-row { display:flex; align-items:center; gap:0.6rem; padding:0.5rem 0.4rem; border-bottom:1px solid rgba(255,255,255,0.04); text-decoration:none; transition:background 0.15s; border-radius:6px; }
  .recent-row:last-of-type { border:none; }
  .recent-row:hover { background:rgba(102,252,241,0.05); }
  .recent-type { font-size:1rem; }
  .recent-id { font-family:monospace; font-size:0.82rem; color:var(--secondary); flex:1; }
  .recent-meta { font-size:0.78rem; color:var(--text-main); }
  .recent-arrow { color:var(--text-main); font-size:0.8rem; }
  .view-all { display:block; text-align:center; margin-top:0.5rem; font-size:0.78rem; color:var(--secondary); text-decoration:none; }

  .action-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
  .action-card { background:var(--panel-bg); border:1px solid var(--glass-border); border-radius:16px; padding:1.4rem; text-decoration:none; display:flex; flex-direction:column; gap:0.3rem; transition:all 0.25s; }
  .action-card:hover { border-color:var(--secondary); transform:translateY(-3px); box-shadow:0 15px 30px -12px rgba(102,252,241,0.2); }
  .action-icon { font-size:1.6rem; }
  .action-title { font-size:1.15rem; font-weight:700; color:var(--text-light); }
  .action-desc { font-size:0.78rem; color:var(--text-main); line-height:1.4; flex:1; }
  .action-cta { font-size:0.82rem; color:var(--secondary); font-weight:600; margin-top:0.3rem; }

  .hero { min-height:calc(100vh - 80px); display:flex; flex-direction:column; justify-content:center; padding:2rem 3rem; max-width:900px; margin:0 auto; width:100%; box-sizing:border-box; }
  .hero-badge { font-size:0.75rem; color:var(--primary); letter-spacing:1.5px; text-transform:uppercase; font-weight:600; margin-bottom:1.5rem; }
  .hero-title { font-size:clamp(2rem,5vw,3.5rem); font-weight:800; color:var(--text-light); margin:0 0 1.5rem; line-height:1.1; }
  .accent { color:var(--secondary); }
  .hero-subtitle { font-size:1.1rem; color:var(--text-main); max-width:520px; line-height:1.7; margin:0 0 2.5rem; }
  .cta-row { display:flex; gap:1rem; align-items:center; margin-bottom:3rem; flex-wrap:wrap; }
  .cta-primary { background:linear-gradient(135deg,var(--primary),var(--secondary)); color:var(--bg-color); padding:0.9rem 1.8rem; border-radius:12px; font-weight:700; font-size:1rem; text-decoration:none; }
  .cta-primary:hover { opacity:0.88; }
  .cta-secondary { color:var(--secondary); font-weight:600; font-size:1rem; text-decoration:none; padding:0.9rem 0.5rem; }
  .features-bar { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; border-top:1px solid var(--glass-border); padding-top:2rem; }
  .feature-item { display:flex; flex-direction:column; gap:0.3rem; }
  .feature-label { font-size:0.8rem; font-weight:700; color:var(--text-light); text-transform:uppercase; letter-spacing:0.5px; }
  .feature-desc { font-size:0.75rem; color:var(--primary); }

  @media (max-width:700px) {
    .balance-card { grid-template-columns:1fr; }
    .stats-row { grid-template-columns:repeat(2,1fr); }
    .action-grid { grid-template-columns:1fr; }
    .features-bar { grid-template-columns:repeat(2,1fr); }
    .hero { padding:1.5rem; }
  }
</style>
