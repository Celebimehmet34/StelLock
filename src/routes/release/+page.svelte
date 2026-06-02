<script lang="ts">
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { tw } from '$lib/stellar/tw-client';

  let escrowId = 'escrow_xyz123';
  let expectedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // example hash
  let files: FileList;
  let status = '';
  let matchStatus = '';
  let isMatch = false;
  let loading = false;

  async function verifyFile() {
    if (!files || files.length === 0) return;
    
    status = 'Verifying file integrity...';
    const file = files[0];
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    isMatch = (calculatedHash === expectedHash);
    
    if (isMatch) {
      matchStatus = 'Success: File matches the on-chain evidence hash!';
    } else {
      matchStatus = 'Warning: File does NOT match the on-chain evidence hash!';
    }
    status = 'Verification complete.';
  }

  async function handleRelease() {
    try {
      loading = true;
      status = 'Waiting for Passkey signature to release funds...';
      
      // Sign with Face ID
      await passkeyAdapter.signWithPasskey({ action: 'release', escrowId });
      
      status = 'Signed! Calling Trustless Work contract...';
      
      // Release funds
      await tw.releaseEscrow(escrowId);
      
      status = 'Funds released successfully. Payment settled!';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Release | Emanet Infrastructure</title>
</svelte:head>

<div class="glass-card">
  <h1>Release</h1>
  <p class="subtitle">Verify work and authorize payment</p>

  <div class="form-group">
    <label for="escrowId">Escrow ID</label>
    <input type="text" id="escrowId" bind:value={escrowId} />
  </div>

  <div class="form-group">
    <label for="expectedHash">Expected Evidence Hash (From Chain)</label>
    <input type="text" id="expectedHash" bind:value={expectedHash} />
  </div>

  <div class="form-group">
    <label for="file">Downloaded Deliverable</label>
    <input type="file" id="file" bind:files={files} on:change={verifyFile} style="padding: 0.8rem;" />
  </div>

  {#if matchStatus}
    <div class="status-box" style="margin-top: 0; margin-bottom: 1.5rem; border-color: {isMatch ? '#45a29e' : '#f44336'}; background: {isMatch ? 'rgba(69, 162, 158, 0.1)' : 'rgba(244, 67, 54, 0.1)'};">
      {matchStatus}
    </div>
  {/if}

  <button on:click={handleRelease} disabled={loading || !isMatch} style="background: {isMatch ? '' : 'linear-gradient(135deg, #555, #333)'}">
    {loading ? 'Processing...' : 'Approve & Release Funds'}
  </button>

  {#if status && !status.includes('Verifying')}
    <div class="status-box">
      <strong>Status:</strong> {status}
    </div>
  {/if}
</div>
