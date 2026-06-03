<script lang="ts">
  import { goto } from '$app/navigation';
  import { encryptTerms, sha256hex } from '$lib/utils/privacy';
  import { proveAmountInRange } from '$lib/zk/prover';
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { tw } from '$lib/stellar/tw-client';
  import { escrowStore, userStore, historyStore } from '$lib/store';
  import { onMount } from 'svelte';

  let amount = $state('100');
  let minAmount = $state('50');
  let maxAmount = $state('1000');
  let price = $state<{ xlm_usd: number | null; xlm_eur: number | null; xlm_try: number | null } | null>(null);

  async function fetchPrice() {
    try { const r = await fetch('/api/price'); if (r.ok) price = await r.json(); } catch {}
  }

  let counterparty = $state('');
  let terms = $state('I will pay 100 USDC for the landing page design. Due in 7 days.');
  let status = $state('');
  let termsHash = $state('');
  let escrowId = $state('');
  let explorerUrl = $state('');
  let encryptedCid = $state('');
  let zkCommitment = $state('');
  let zkVerified = $state(false);
  let zkExplorerUrl = $state('');
  let loading = $state(false);
  let done = $state(false);
  let copied = $state(false);
  let warning = $state('');

  async function copyEscrowId() {
    await navigator.clipboard.writeText(escrowId);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  onMount(() => {
    if (!$userStore.isLoggedIn) goto('/login');
    fetchPrice();
  });

  async function handleDeposit() {
    if (!$userStore.secretKey) { goto('/login'); return; }

    try {
      loading = true;

      // ── 1. ZK proof: amount is in [min, max] without revealing it ──
      status = '🔬 Generating BLS12-381 ZK proof (amount stays private)...';
      const zk = await proveAmountInRange(amount, minAmount, maxAmount);
      zkCommitment = zk.commitment;

      // Verify ON-CHAIN via the deployed Soroban contract (BLS12-381 pairing)
      status = '⛓️ Verifying proof ON-CHAIN (Soroban BLS12-381)...';
      const zkRes = await fetch('/api/zk/verify-onchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof: zk.proof, publicSignals: zk.publicSignals })
      });
      if (zkRes.ok) {
        const v = await zkRes.json();
        zkVerified = v.verified;
        zkExplorerUrl = v.explorerUrl;
      } else {
        throw new Error('On-chain ZK verification failed: ' + (await zkRes.text()));
      }

      // ── 2. Encrypt terms ──
      status = 'Encrypting commercial terms...';
      const encrypted = await encryptTerms(terms, $userStore.secretKey);
      const encryptedJson = JSON.stringify(encrypted);

      // ── 3. Upload encrypted terms to IPFS ──
      status = 'Uploading encrypted terms to IPFS...';
      const formData = new FormData();
      formData.append('file', new Blob([encryptedJson], { type: 'application/json' }), 'terms.enc');
      const ipfsRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (ipfsRes.ok) {
        const { cid } = await ipfsRes.json();
        encryptedCid = cid;
      } else {
        warning = '⚠️ IPFS storage failed — terms committed on-chain but won\'t be re-readable later.';
      }

      // ── 4. On-chain commitment ──
      termsHash = await sha256hex(encryptedJson);
      status = 'Waiting for Face ID...';
      await passkeyAdapter.signWithPasskey({ amount, termsHash, zkCommitment });

      // ── 5. Fund escrow on Stellar ──
      status = 'Submitting to Stellar testnet...';
      const newEscrowId = 'esc_' + Math.random().toString(36).slice(2, 9);
      const result = await tw.fundEscrow($userStore.secretKey, newEscrowId, termsHash, amount, counterparty, encryptedCid, zkCommitment);

      escrowId = newEscrowId;
      explorerUrl = result.explorerUrl;

      escrowStore.update(s => ({ ...s, escrowId, encryptedTermsCid: encryptedCid, sellerPublicKey: counterparty }));

      historyStore.add($userStore.publicKey, {
        type: 'deposit',
        escrowId,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        meta: { amount, zkCommitment: zkCommitment.slice(0, 16) + '...', encryptedCid }
      });

      done = true;
      status = 'Funds locked on Stellar testnet.';
    } catch (e) {
      status = 'Error: ' + (e instanceof Error ? e.message : e);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Deposit | Emanet</title></svelte:head>

<div class="glass-card">
  <h1>Deposit</h1>
  <p class="subtitle">Lock funds · ZK proof + AES encryption + Stellar tx</p>

  {#if price}
    <div class="oracle-bar">
      <span class="oracle-label">📡 Reflector Oracle</span>
      {#if price.xlm_usd}
        <span class="oracle-price">1 XLM = <strong>${price.xlm_usd.toFixed(4)}</strong></span>
        <span class="oracle-sep">·</span>
        <span class="oracle-price">€{price.xlm_eur?.toFixed(4)}</span>
        <span class="oracle-sep">·</span>
        <span class="oracle-price">₺{price.xlm_try?.toFixed(2)}</span>
      {:else}
        <span class="oracle-price">Price unavailable</span>
      {/if}
    </div>
  {/if}

  <div class="form-group">
    <label for="amount">Amount (USDC) <span class="private-tag">🔒 ZK-private</span></label>
    <input type="number" id="amount" bind:value={amount} disabled={done} />
  </div>

  <div class="range-row">
    <div class="form-group">
      <label for="min">Min (public)</label>
      <input type="number" id="min" bind:value={minAmount} disabled={done} />
    </div>
    <div class="form-group">
      <label for="max">Max (public)</label>
      <input type="number" id="max" bind:value={maxAmount} disabled={done} />
    </div>
  </div>
  <small class="hint">ZK proof shows amount is in [{minAmount}, {maxAmount}] — exact amount never disclosed.</small>

  <div class="form-group" style="margin-top:1rem">
    <label for="counterparty">Seller Public Key</label>
    <input type="text" id="counterparty" bind:value={counterparty} placeholder="G... (funds go here on release)" disabled={done} />
  </div>

  <div class="form-group">
    <label for="terms">Commercial Terms <span class="private-tag">🔒 AES-encrypted</span></label>
    <textarea id="terms" rows="3" bind:value={terms} disabled={done}></textarea>
  </div>

  {#if !done}
    <button onclick={handleDeposit} disabled={loading}>
      {loading ? status : '🔒 Lock with ZK Proof + Face ID'}
    </button>
  {:else}
    <div class="success-banner">✅ Funds locked on Stellar testnet.</div>

    {#if zkVerified}
      <div class="zk-badge">⛓️ ZK Proof verified ON-CHAIN (Soroban BLS12-381) — amount never disclosed</div>
      {#if zkExplorerUrl}
        <a href={zkExplorerUrl} target="_blank" class="explorer-link">🔬 View verifier contract →</a>
      {/if}
    {/if}

    {#if explorerUrl}
      <a href={explorerUrl} target="_blank" class="explorer-link">🔍 Verify on StellarExpert →</a>
    {/if}

    <div class="handoff-box">
      <div class="handoff-title">📤 Share with your seller</div>
      <p class="handoff-text">
        Send this Escrow ID to your seller. They log in with their own account and
        submit the work under <strong>Deliver</strong>. You'll come back to <strong>Release</strong> once they deliver.
      </p>
      <div class="escrow-id-row">
        <code class="escrow-id">{escrowId}</code>
        <button class="copy-btn" onclick={copyEscrowId}>{copied ? '✅ Copied' : '📋 Copy'}</button>
      </div>
    </div>

    <a href="/deliver" class="demo-link">Demo: continue as the seller →</a>
  {/if}

  {#if warning}
    <div class="status-box warning-box">{warning}</div>
  {/if}

  {#if status && !done}
    <div class="status-box">
      <strong>Status:</strong> {status}
      {#if zkCommitment}
        <div style="margin-top:6px"><strong>ZK Commitment:</strong><span class="hash-text">{zkCommitment.slice(0,24)}...</span></div>
      {/if}
      {#if termsHash}
        <div style="margin-top:6px"><strong>Terms Hash:</strong><span class="hash-text">{termsHash.slice(0,24)}...</span></div>
      {/if}
    </div>
  {/if}

  {#if done && (termsHash || encryptedCid || escrowId)}
    <div class="status-box" style="margin-top:1rem">
      {#if termsHash}<div><strong>Terms hash:</strong><span class="hash-text">{termsHash}</span></div>{/if}
      {#if encryptedCid}<div style="margin-top:6px"><strong>Encrypted terms (IPFS):</strong><span class="hash-text">{encryptedCid}</span></div>{/if}
      {#if zkCommitment}<div style="margin-top:6px"><strong>ZK commitment:</strong><span class="hash-text">{zkCommitment.slice(0,30)}...</span></div>{/if}
    </div>
  {/if}
</div>

<style>
  .private-tag { font-size:0.65rem; background:rgba(69,162,158,0.2); color:var(--primary); padding:2px 6px; border-radius:4px; margin-left:4px; font-weight:600; }
  .hint { font-size:0.72rem; color:var(--primary); display:block; }
  .range-row { display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; }
  .success-banner { width:100%; padding:1.2rem; background:linear-gradient(135deg,#45a29e,#66fcf1); color:#0b0c10; border-radius:12px; font-size:1.1rem; font-weight:700; text-align:center; box-sizing:border-box; }
  .zk-badge { margin-top:0.8rem; padding:0.6rem 1rem; background:rgba(102,252,241,0.08); border:1px solid rgba(102,252,241,0.25); border-radius:10px; font-size:0.82rem; color:var(--secondary); font-weight:600; text-align:center; }
  .explorer-link { display:block; margin-top:0.8rem; text-align:center; color:var(--secondary); font-size:0.9rem; font-weight:600; text-decoration:none; }
  .explorer-link:hover { text-decoration:underline; }
  .handoff-box { margin-top:1.5rem; padding:1.2rem; background:rgba(102,252,241,0.05); border:1px solid rgba(102,252,241,0.2); border-radius:12px; }
  .handoff-title { font-weight:700; color:var(--secondary); font-size:0.9rem; margin-bottom:0.5rem; }
  .handoff-text { font-size:0.82rem; color:var(--text-main); line-height:1.6; margin:0 0 1rem; }
  .escrow-id-row { display:flex; gap:0.5rem; align-items:center; }
  .escrow-id { flex:1; font-family:monospace; font-size:0.85rem; color:var(--secondary); background:rgba(0,0,0,0.3); padding:0.6rem 0.8rem; border-radius:8px; word-break:break-all; }
  .copy-btn { background:rgba(102,252,241,0.1); border:1px solid rgba(102,252,241,0.3); color:var(--secondary); padding:0.6rem 0.9rem; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer; white-space:nowrap; width:auto; margin:0; box-shadow:none; text-transform:none; letter-spacing:0; }
  .copy-btn:hover { background:rgba(102,252,241,0.2); transform:none; }
  .demo-link { display:block; margin-top:1rem; text-align:center; color:var(--text-main); font-size:0.78rem; text-decoration:none; opacity:0.7; }
  .demo-link:hover { opacity:1; color:var(--secondary); }
  .warning-box { border-color:#f0a500; background:rgba(240,165,0,0.1); color:#f0a500; }
  .oracle-bar { display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; background:rgba(102,252,241,0.05); border:1px solid rgba(102,252,241,0.15); border-radius:10px; padding:0.6rem 0.9rem; margin-bottom:1.5rem; font-size:0.78rem; }
  .oracle-label { color:var(--primary); font-weight:700; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.5px; }
  .oracle-price { color:var(--text-light); }
  .oracle-price strong { color:var(--secondary); }
  .oracle-sep { color:var(--glass-border); }
</style>
