<script lang="ts">
  import { goto } from '$app/navigation';
  import { encryptTerms, sha256hex } from '$lib/utils/privacy';
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { fundEscrowTx } from '$lib/stellar/transactions';
  import { escrowStore, userStore } from '$lib/store';
  import { onMount } from 'svelte';

  let amount = $state('100');
  let counterparty = $state('');
  let terms = $state('I will pay 100 USDC for the landing page design. Due in 7 days.');
  let status = $state('');
  let termsHash = $state('');
  let escrowId = $state('');
  let explorerUrl = $state('');
  let encryptedCid = $state('');
  let loading = $state(false);
  let done = $state(false);

  onMount(() => {
    if (!$userStore.isLoggedIn || $userStore.role !== 'buyer') {
      goto('/login');
    }
  });

  async function handleDeposit() {
    if (!$userStore.secretKey) { status = 'Session expired. Please log in again.'; goto('/login'); return; }

    try {
      loading = true;
      status = 'Encrypting commercial terms with your key...';

      // AES-256-GCM encrypt terms with buyer's Stellar secret
      const encrypted = await encryptTerms(terms, $userStore.secretKey);
      const encryptedJson = JSON.stringify(encrypted);

      // Upload encrypted terms to IPFS
      status = 'Uploading encrypted terms to IPFS...';
      const formData = new FormData();
      formData.append('file', new Blob([encryptedJson], { type: 'application/json' }), 'terms.enc');
      const ipfsRes = await fetch('/api/upload', { method: 'POST', body: formData });

      if (ipfsRes.ok) {
        const { cid } = await ipfsRes.json();
        encryptedCid = cid;
      }

      // On-chain commitment = SHA-256(encrypted JSON)
      termsHash = await sha256hex(encryptedJson);
      status = 'Terms encrypted. Waiting for Face ID...';

      await passkeyAdapter.signWithPasskey({ amount, termsHash });

      status = 'Submitting to Stellar testnet...';
      const newEscrowId = 'esc_' + Math.random().toString(36).slice(2, 9);
      const result = await fundEscrowTx($userStore.secretKey, newEscrowId, termsHash, amount);

      escrowId = newEscrowId;
      explorerUrl = result.explorerUrl;

      escrowStore.update(s => ({
        ...s,
        escrowId,
        encryptedTermsCid: encryptedCid
      }));

      done = true;
      status = 'Funds locked on Stellar testnet.';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Deposit | Emanet</title></svelte:head>

<div class="glass-card">
  <div class="role-banner buyer">🔒 Buyer — {$userStore.username}</div>

  <h1>Deposit</h1>
  <p class="subtitle">Lock USDC · Terms encrypted with your key</p>

  <div class="form-group">
    <label for="amount">Amount (USDC)</label>
    <input type="number" id="amount" bind:value={amount} disabled={done} />
  </div>

  <div class="form-group">
    <label for="counterparty">Seller / Freelancer Public Key</label>
    <input type="text" id="counterparty" bind:value={counterparty} placeholder="G..." disabled={done} />
  </div>

  <div class="form-group">
    <label for="terms">Commercial Terms (private)</label>
    <textarea id="terms" rows="4" bind:value={terms} disabled={done}></textarea>
    <small class="hint">Encrypted with AES-256-GCM using your key — only you can read this.</small>
  </div>

  {#if !done}
    <button onclick={handleDeposit} disabled={loading}>
      {loading ? 'Submitting to Stellar...' : '🔒 Lock with Face ID'}
    </button>
  {:else}
    <div class="success-banner">✅ Funds locked on Stellar testnet.</div>
    {#if explorerUrl}
      <a href={explorerUrl} target="_blank" class="explorer-link">🔍 Verify on StellarExpert →</a>
    {/if}
    <button onclick={() => goto('/deliver')} class="next-btn">Next → Deliver (share with seller)</button>
  {/if}

  {#if status}
    <div class="status-box">
      <strong>Status:</strong> {status}
      {#if termsHash}
        <div style="margin-top:8px"><strong>On-chain commitment (SHA-256):</strong><span class="hash-text">{termsHash}</span></div>
      {/if}
      {#if encryptedCid}
        <div style="margin-top:8px"><strong>Encrypted terms (IPFS):</strong><span class="hash-text">{encryptedCid}</span></div>
      {/if}
      {#if escrowId}
        <div style="margin-top:8px"><strong>Escrow ID:</strong><span class="hash-text">{escrowId}</span></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .role-banner {
    border-radius: 8px;
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .role-banner.buyer { background: rgba(69,162,158,0.15); color: var(--secondary); border: 1px solid rgba(69,162,158,0.3); }
  .hint { font-size: 0.75rem; color: var(--primary); margin-top: 0.4rem; display: block; }
  .success-banner { width:100%; padding:1.2rem; background:linear-gradient(135deg,#45a29e,#66fcf1); color:#0b0c10; border-radius:12px; font-size:1.1rem; font-weight:700; text-align:center; box-sizing:border-box; }
  .explorer-link { display:block; margin-top:0.8rem; text-align:center; color:var(--secondary); font-size:0.9rem; font-weight:600; text-decoration:none; }
  .explorer-link:hover { text-decoration:underline; }
  .next-btn { margin-top:1rem; background:linear-gradient(135deg,#1f2833,#45a29e); }
</style>
