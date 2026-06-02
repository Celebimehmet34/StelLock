<script lang="ts">
  import { userStore } from '$lib/store';

  let copied = $state(false);

  async function copyKey() {
    await navigator.clipboard.writeText($userStore.publicKey);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  const actions = [
    { title: 'Deposit', icon: '🔒', href: '/deposit', desc: 'Lock funds. Terms encrypted with your key, hash committed on-chain.' },
    { title: 'Deliver', icon: '📦', href: '/deliver', desc: 'Submit work to IPFS. Cryptographic proof written to the contract.' },
    { title: 'Release', icon: '✅', href: '/release', desc: 'Verify the deliverable on-chain. Approve with Face ID. Funds settle.' },
    { title: 'History', icon: '🧾', href: '/history', desc: 'Your past escrows with on-chain verification links.' }
  ];

  const features = [
    { label: 'Verifiable Delivery', desc: 'IPFS + SHA-256 hash on-chain' },
    { label: 'Privacy Layer', desc: 'AES-256-GCM, only the buyer reads terms' },
    { label: 'No Seed Phrases', desc: 'Username + password wallet' },
    { label: 'Built on Trustless Work', desc: 'Battle-tested Soroban escrow' }
  ];
</script>

<svelte:head>
  <title>Emanet — Verifiable Delivery Infrastructure</title>
</svelte:head>

{#if $userStore.isLoggedIn}
  <!-- ── Dashboard (logged in) ── -->
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

    <p class="dash-hint">
      Share your public key with a buyer to receive an escrow, or start one yourself below.
    </p>

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
  <!-- ── Landing (logged out) ── -->
  <div class="hero">
    <div class="hero-content">
      <div class="hero-badge">Built on Trustless Work · Stellar · Soroban</div>
      <h1 class="hero-title">
        Proof of delivery.<br/>
        <span class="accent">Not promise of delivery.</span>
      </h1>
      <p class="hero-subtitle">
        Emanet adds verifiable delivery, commercial privacy, and seedless wallets
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
  /* ── Dashboard ── */
  .dash { max-width: 880px; margin: 0 auto; padding: 3rem 2rem; width: 100%; box-sizing: border-box; }
  .dash-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
  .welcome { color: var(--text-main); font-size: 0.9rem; }
  .username { color: var(--text-light); font-size: 2.2rem; margin: 0.2rem 0 0; font-weight: 800; }
  .key-chip { background: rgba(102,252,241,0.08); border: 1px solid rgba(102,252,241,0.25); color: var(--secondary); padding: 0.5rem 1rem; border-radius: 10px; font-family: monospace; font-size: 0.82rem; font-weight: 600; cursor: pointer; width: auto; margin: 0; box-shadow: none; text-transform: none; letter-spacing: 0; transition: background 0.2s; }
  .key-chip:hover { background: rgba(102,252,241,0.16); transform: none; }
  .dash-hint { color: var(--text-main); font-size: 0.9rem; margin: 1.2rem 0 2rem; }

  .action-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.2rem; }
  .action-card { background: var(--panel-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 1.6rem; text-decoration: none; display: flex; flex-direction: column; gap: 0.4rem; transition: all 0.25s ease; backdrop-filter: blur(16px); }
  .action-card:hover { border-color: var(--secondary); transform: translateY(-4px); box-shadow: 0 20px 40px -15px rgba(102,252,241,0.2); }
  .action-icon { font-size: 1.8rem; }
  .action-title { font-size: 1.25rem; font-weight: 700; color: var(--text-light); }
  .action-desc { font-size: 0.82rem; color: var(--text-main); line-height: 1.5; flex: 1; }
  .action-cta { font-size: 0.85rem; color: var(--secondary); font-weight: 600; margin-top: 0.4rem; }

  /* ── Landing ── */
  .hero { min-height: calc(100vh - 80px); display: flex; flex-direction: column; justify-content: center; padding: 2rem 3rem; max-width: 900px; margin: 0 auto; width: 100%; box-sizing: border-box; }
  .hero-badge { font-size: 0.75rem; color: var(--primary); letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; margin-bottom: 1.5rem; }
  .hero-title { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; color: var(--text-light); margin: 0 0 1.5rem 0; line-height: 1.1; }
  .accent { color: var(--secondary); }
  .hero-subtitle { font-size: 1.1rem; color: var(--text-main); max-width: 520px; line-height: 1.7; margin: 0 0 2.5rem 0; }

  .cta-row { display: flex; gap: 1rem; align-items: center; margin-bottom: 3rem; flex-wrap: wrap; }
  .cta-primary { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: var(--bg-color); padding: 0.9rem 1.8rem; border-radius: 12px; font-weight: 700; font-size: 1rem; text-decoration: none; transition: opacity 0.2s; }
  .cta-primary:hover { opacity: 0.88; }
  .cta-secondary { color: var(--secondary); font-weight: 600; font-size: 1rem; text-decoration: none; padding: 0.9rem 0.5rem; }
  .cta-secondary:hover { text-decoration: underline; }

  .features-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; border-top: 1px solid var(--glass-border); padding-top: 2rem; }
  .feature-item { display: flex; flex-direction: column; gap: 0.3rem; }
  .feature-label { font-size: 0.8rem; font-weight: 700; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; }
  .feature-desc { font-size: 0.75rem; color: var(--primary); }

  @media (max-width: 700px) {
    .action-grid { grid-template-columns: 1fr; }
    .features-bar { grid-template-columns: repeat(2, 1fr); }
    .hero { padding: 1.5rem; }
  }
</style>
