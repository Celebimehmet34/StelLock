<script lang="ts">
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { tw } from '$lib/stellar/tw-client';
  import { escrowStore } from '$lib/store';
  import { get } from 'svelte/store';

  const stored = get(escrowStore);
  let escrowId = $state(stored.escrowId || '');
  let expectedHash = $state(stored.evidenceHash || '');
  let files = $state<FileList | undefined>(undefined);
  let status = $state('');
  let matchStatus = $state('');
  let isMatch = $state(false);
  let explorerUrl = $state('');
  let loading = $state(false);
  let released = $state(false);

  async function verifyFile() {
    if (!files || files.length === 0) return;
    status = 'Verifying file integrity...';
    const file = files[0];
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const calculatedHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    isMatch = expectedHash.length > 0 && calculatedHash === expectedHash;
    matchStatus = isMatch
      ? '✅ File matches the on-chain evidence hash.'
      : expectedHash
        ? `⚠️ Hash mismatch. Calculated: ${calculatedHash.slice(0, 20)}...`
        : `📋 File hash: ${calculatedHash}`;
    status = '';
  }

  async function handleRelease() {
    try {
      loading = true;
      status = 'Waiting for Face ID...';
      await passkeyAdapter.signWithPasskey({ action: 'release', escrowId });
      status = 'Releasing funds on Stellar testnet...';
      await tw.releaseEscrow(escrowId);
      explorerUrl = tw.getExplorerUrl('release') ?? '';
      released = true;
      status = '🎉 Payment settled on Stellar.';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Release | Emanet</title></svelte:head>

<div class="glass-card">
  <h1>Release</h1>
  <p class="subtitle">Verify work and authorize payment</p>

  <div class="form-group">
    <label for="escrowId">Escrow ID</label>
    <input type="text" id="escrowId" bind:value={escrowId} />
  </div>

  <div class="form-group">
    <label for="expectedHash">Expected Evidence Hash (from chain)</label>
    <input type="text" id="expectedHash" bind:value={expectedHash} placeholder="Auto-filled from Deliver step" />
  </div>

  <div class="form-group">
    <label for="file">Downloaded Deliverable</label>
    <input type="file" id="file" bind:files onchange={verifyFile} style="padding: 0.8rem;" />
  </div>

  {#if matchStatus}
    <div class="status-box" style="margin-top:0; margin-bottom:1.5rem;
      border-color:{isMatch ? '#45a29e' : '#f44336'};
      background:{isMatch ? 'rgba(69,162,158,0.1)' : 'rgba(244,67,54,0.1)'};">
      {matchStatus}
    </div>
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
  .success-banner {
    width: 100%; padding: 1.2rem;
    background: linear-gradient(135deg, #45a29e, #66fcf1);
    color: #0b0c10; border-radius: 12px; font-size: 1.1rem;
    font-weight: 700; text-align: center; box-sizing: border-box;
  }
  .explorer-link {
    display: block; margin-top: 0.8rem; text-align: center;
    color: var(--secondary); font-size: 0.9rem; font-weight: 600; text-decoration: none;
  }
  .explorer-link:hover { text-decoration: underline; }
</style>
