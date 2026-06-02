<script lang="ts">
  const steps = [
    {
      number: '01',
      title: 'Deposit',
      description: 'Lock USDC in escrow. Commercial terms are hashed on-chain — plaintext never stored.',
      href: '/deposit',
      icon: '🔒'
    },
    {
      number: '02',
      title: 'Deliver',
      description: 'Upload deliverable to IPFS. Cryptographic proof (SHA-256) is written to the smart contract.',
      href: '/deliver',
      icon: '📦'
    },
    {
      number: '03',
      title: 'Release',
      description: 'Verify file integrity on-chain. Approve with Face ID. Funds settle in seconds.',
      href: '/release',
      icon: '✅'
    }
  ];

  const features = [
    { label: 'Verifiable Delivery', desc: 'IPFS + SHA-256 hash on-chain' },
    { label: 'Privacy Layer', desc: 'SHA-256 commitment scheme' },
    { label: 'No Seed Phrases', desc: 'Face ID / Touch ID signing' },
    { label: 'Built on Trustless Work', desc: 'Battle-tested Soroban escrow' },
  ];
</script>

<svelte:head>
  <title>Emanet — Verifiable Delivery Infrastructure</title>
</svelte:head>

<div class="hero">
  <div class="hero-content">
    <div class="hero-badge">Built on Trustless Work · Stellar · Soroban</div>
    <h1 class="hero-title">
      Proof of delivery.<br/>
      <span class="accent">Not promise of delivery.</span>
    </h1>
    <p class="hero-subtitle">
      Emanet adds verifiable delivery, privacy, and biometric signing
      on top of Stellar's battle-tested escrow infrastructure.
    </p>

    <div class="steps-grid">
      {#each steps as step}
        <a href={step.href} class="step-card">
          <div class="step-number">{step.number}</div>
          <div class="step-icon">{step.icon}</div>
          <div class="step-title">{step.title}</div>
          <div class="step-desc">{step.description}</div>
          <div class="step-cta">Go →</div>
        </a>
      {/each}
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

<style>
  .hero {
    min-height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 2rem 3rem;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .hero-badge {
    font-size: 0.75rem;
    color: var(--primary);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 1.5rem;
  }

  .hero-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    color: var(--text-light);
    margin: 0 0 1.5rem 0;
    line-height: 1.1;
  }

  .accent {
    color: var(--secondary);
  }

  .hero-subtitle {
    font-size: 1.1rem;
    color: var(--text-main);
    max-width: 520px;
    line-height: 1.7;
    margin: 0 0 3rem 0;
  }

  .steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .step-card {
    background: var(--panel-bg);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 1.8rem;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: all 0.3s ease;
    backdrop-filter: blur(16px);
  }

  .step-card:hover {
    border-color: var(--secondary);
    transform: translateY(-4px);
    box-shadow: 0 20px 40px -15px rgba(102, 252, 241, 0.2);
  }

  .step-number {
    font-size: 0.7rem;
    color: var(--primary);
    font-weight: 700;
    letter-spacing: 2px;
  }

  .step-icon {
    font-size: 1.8rem;
    margin: 0.3rem 0;
  }

  .step-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-light);
  }

  .step-desc {
    font-size: 0.82rem;
    color: var(--text-main);
    line-height: 1.5;
    flex: 1;
  }

  .step-cta {
    font-size: 0.85rem;
    color: var(--secondary);
    font-weight: 600;
    margin-top: 0.5rem;
  }

  .features-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    border-top: 1px solid var(--glass-border);
    padding-top: 2rem;
  }

  .feature-item {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .feature-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-light);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .feature-desc {
    font-size: 0.75rem;
    color: var(--primary);
  }

  @media (max-width: 700px) {
    .steps-grid { grid-template-columns: 1fr; }
    .features-bar { grid-template-columns: repeat(2, 1fr); }
    .hero { padding: 1.5rem; }
  }
</style>
