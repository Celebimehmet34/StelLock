<script lang="ts">
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { releaseEscrowTx } from '$lib/stellar/transactions';
  import { decryptTerms } from '$lib/utils/privacy';
  import { escrowStore, userStore } from '$lib/store';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  const stored = get(escrowStore);
  let escrowId = $state(stored.escrowId || '');
  let expectedHash = $state(stored.evidenceHash || '');
  let sellerPublicKey = $state('');
  let files = $state<FileList | undefined>(undefined);
  let status = $state('');
  let matchStatus = $state('');
  let isMatch = $state(false);
  let explorerUrl = $state('');
  let loading = $state(false);
  let released = $state(false);
  let decryptedTerms = $state('');
  let showTerms = $state(false);

  onMount(() => {
    if (!$userStore.isLoggedIn || $userStore.role !== 'buyer') {
      goto('/login');
    }
  });

  async function verifyFile() {
    if (!files || files.length === 0) return;
    status = 'Verifying file integrity...';
    const file = files[0];
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const calculatedHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
    isMatch = expectedHash.length > 0 && calculatedHash === expectedHash;
    matchStatus = isMatch
      ? '✅ File matches the on-chain evidence hash.'
      : expectedHash
        ? `⚠️ Hash mismatch. Calculated: ${calculatedHash.slice(0,20)}...`
        : `📋 File hash: ${calculatedHash}`;
    status = '';
  }

  async function handleRelease() {
    if (!$userStore.secretKey) { status = 'Session expired. Please log in again.'; goto('/login'); return; }

    try {
      loading = true;
      status = 'Waiting for Face ID...';
      await passkeyAdapter.signWithPasskey({ action: 'release', escrowId });

      status = 'Releasing funds on Stellar testnet...';
      const result = await releaseEscrowTx($userStore.secretKey, sellerPublicKey || 'GA2L56GH7ZB4PRKVGXEXD2E5JZBHIU7IDI2XDHWKWHYLTWFC7G6VG5SB', escrowId);

      explorerUrl = result.explorerUrl;
      released = true;
      status = '🎉 Payment settled on Stellar.';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }

  async function handleDecryptTerms() {
    if (!$userStore.secretKey) return;
    const cid = stored.encryptedTermsCid;
    if (!cid) { decryptedTerms = '(No encrypted terms found for this escrow)'; showTerms = true; return; }

    try {
      status = 'Fetching encrypted terms from IPFS...';
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      const encrypted = await res.json();
      decryptedTerms = await decryptTerms(encrypted, $userStore.secretKey);
      showTerms = true;
      status = '';
    } catch (e) {
      decryptedTerms = 'Failed to decrypt: ' + e;
      showTerms = true;
      status = '';
    }
  }
</script>

<svelte:head><title>Release | Emanet</title></svelte:head>

<div class="glass-card">
  <div class="role-banner buyer">🔒 Buyer — {$userStore.username}</div>

  <h1>Release</h1>
  <p class="subtitle">Verify work and authorize payment</p>

  <div class="form-group">
    <label for="escrowId">Escrow ID</label>
    <input type="text" id="escrowId" bind:value={escrowId} />
  </div>

  <div class="form-group">
    <label for="expectedHash">Evidence Hash (from chain)</label>
    <input type="text" id="expectedHash" bind:value={expectedHash} placeholder="Auto-filled from Deliver step" />
  </div>

  <div class="form-group">
    <label for="sellerKey">Seller Public Key</label>
    <input type="text" id="sellerKey" bind:value={sellerPublicKey} placeholder="G... (seller's Stellar address)" />
  </div>

  <div class="form-group">
    <label for="file">Downloaded Deliverable</label>
    <input type="file" id="file" bind:files onchange={verifyFile} style="padding:0.8rem;" />
  </div>

  {#if matchStatus}
    <div class="status-box" style="margin-top:0;margin-bottom:1.5rem;border-color:{isMatch?'#45a29e':'#f44336'};background:{isMatch?'rgba(69,162,158,0.1)':'rgba(244,67,54,0.1)'};">
      {matchStatus}
    </div>
  {/if}

  <!-- Decrypt terms button -->
  <button onclick={handleDecryptTerms} class="secondary-btn" style="margin-bottom:1rem;">
    🔓 Decrypt & View My Terms
  </button>

  {#if showTerms}
    <div class="terms-box">{decryptedTerms}</div>
  {/if}

  {#if !released}
    <button onclick={handleRelease} disabled={loading || (expectedHash.length > 0 && !isMatch)}>
      {loading ? 'Submitting to Stellar...' : '✅ Approve & Release Funds'}
    </button>
  {:else}
    <div class="success-banner">🎉 Payment settled on Stellar in seconds.</div>
    {#if explorerUrl}
      <a href={explorerUrl} target="_blank" class="explorer-link">🔍 Verify on StellarExpert →</a>
    {/if}
  {/if}

  {#if status && !released}
    <div class="status-box"><strong>Status:</strong> {status}</div>
  {/if}
</div>

<style>
  .role-banner { border-radius:8px; padding:0.5rem 1rem; font-size:0.8rem; font-weight:700; margin-bottom:1.5rem; text-align:center; text-transform:uppercase; letter-spacing:1px; }
  .role-banner.buyer { background:rgba(69,162,158,0.15); color:var(--secondary); border:1px solid rgba(69,162,158,0.3); }
  .secondary-btn { background:transparent; border:1px solid rgba(255,255,255,0.15); color:var(--text-main); width:100%; padding:0.8rem; border-radius:10px; font-size:0.9rem; cursor:pointer; margin-top:0; box-shadow:none; text-transform:none; letter-spacing:0; transition:border-color 0.2s; }
  .secondary-btn:hover { border-color:var(--secondary); color:var(--secondary); transform:none; }
  .terms-box { background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:1rem; margin-bottom:1rem; font-size:0.85rem; color:var(--text-light); white-space:pre-wrap; word-break:break-word; }
  .success-banner { width:100%; padding:1.2rem; background:linear-gradient(135deg,#45a29e,#66fcf1); color:#0b0c10; border-radius:12px; font-size:1.1rem; font-weight:700; text-align:center; box-sizing:border-box; }
  .explorer-link { display:block; margin-top:0.8rem; text-align:center; color:var(--secondary); font-size:0.9rem; font-weight:600; text-decoration:none; }
  .explorer-link:hover { text-decoration:underline; }
</style>
