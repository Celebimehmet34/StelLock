<script lang="ts">
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { tw } from '$lib/stellar/tw-client';

  let escrowId = $state('escrow_xyz123');
  let expectedHash = $state('');
  let files = $state<FileList | undefined>(undefined);
  let status = $state('');
  let matchStatus = $state('');
  let isMatch = $state(false);
  let loading = $state(false);
  let released = $state(false);

  async function verifyFile() {
    if (!files || files.length === 0) return;

    status = 'Verifying file integrity...';
    const file = files[0];
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const calculatedHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    isMatch = expectedHash.length > 0 && calculatedHash === expectedHash;

    matchStatus = isMatch
      ? '✅ File matches the on-chain evidence hash.'
      : expectedHash
        ? '⚠️ File does NOT match the on-chain hash.'
        : `📋 File hash: ${calculatedHash}`;

    status = '';
  }

  async function handleRelease() {
    try {
      loading = true;
      status = 'Waiting for Face ID...';

      await passkeyAdapter.signWithPasskey({ action: 'release', escrowId });

      status = 'Calling Trustless Work contract...';
      await tw.releaseEscrow(escrowId);

      released = true;
      status = 'Payment settled. Funds released.';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Release | Emanet</title>
</svelte:head>

<div class="glass-card">
  <h1>Release</h1>
  <p class="subtitle">Verify work and authorize payment</p>

  <div class="form-group">
    <label for="escrowId">Escrow ID</label>
    <input type="text" id="escrowId" bind:value={escrowId} />
  </div>

  <div class="form-group">
    <label for="expectedHash">Expected Evidence Hash (from chain)</label>
    <input type="text" id="expectedHash" bind:value={expectedHash} placeholder="Paste hash from Deliver step" />
  </div>

  <div class="form-group">
    <label for="file">Downloaded Deliverable</label>
    <input type="file" id="file" bind:files onchange={verifyFile} style="padding: 0.8rem;" />
  </div>

  {#if matchStatus}
    <div class="status-box" style="margin-top: 0; margin-bottom: 1.5rem; border-color: {isMatch ? '#45a29e' : '#f44336'}; background: {isMatch ? 'rgba(69,162,158,0.1)' : 'rgba(244,67,54,0.1)'};">
      {matchStatus}
    </div>
  {/if}

  {#if !released}
    <button onclick={handleRelease} disabled={loading || (!isMatch && expectedHash.length > 0)}>
      {loading ? 'Processing...' : '✅ Approve & Release Funds'}
    </button>
  {:else}
    <div class="success-banner">
      🎉 Payment settled on Stellar in seconds.
    </div>
  {/if}

  {#if status}
    <div class="status-box">
      <strong>Status:</strong> {status}
    </div>
  {/if}
</div>

<style>
  .success-banner {
    width: 100%;
    padding: 1.2rem;
    background: linear-gradient(135deg, #45a29e, #66fcf1);
    color: #0b0c10;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 700;
    text-align: center;
    margin-top: 1rem;
    box-sizing: border-box;
  }
</style>
