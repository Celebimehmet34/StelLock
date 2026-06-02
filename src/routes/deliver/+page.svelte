<script lang="ts">
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { tw } from '$lib/stellar/tw-client';

  let escrowId = $state('escrow_xyz123');
  let files = $state<FileList | undefined>(undefined);
  let status = $state('');
  let evidenceHash = $state('');
  let ipfsCid = $state('');
  let loading = $state(false);

  async function handleDeliver() {
    if (!files || files.length === 0) {
      status = 'Please select a file to deliver.';
      return;
    }

    try {
      loading = true;
      status = 'Hashing file...';

      const file = files[0];
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      evidenceHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      status = 'Uploading to IPFS...';
      // In production: POST to /api/upload (server uses PINATA_JWT)
      await new Promise(r => setTimeout(r, 1000));
      ipfsCid = 'Qm' + evidenceHash.slice(0, 44);

      status = `Uploaded (CID: ${ipfsCid.slice(0, 20)}...). Waiting for Face ID...`;

      await passkeyAdapter.signWithPasskey({ escrowId, evidenceHash });

      status = 'Writing delivery proof to smart contract...';
      await tw.setEvidence(escrowId, evidenceHash);

      status = 'Delivery recorded on-chain.';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Deliver | Emanet</title>
</svelte:head>

<div class="glass-card">
  <h1>Deliver</h1>
  <p class="subtitle">Submit cryptographic proof of delivery</p>

  <div class="form-group">
    <label for="escrowId">Escrow ID</label>
    <input type="text" id="escrowId" bind:value={escrowId} />
  </div>

  <div class="form-group">
    <label for="file">Work File / Deliverable</label>
    <input type="file" id="file" bind:files style="padding: 0.8rem;" />
  </div>

  <button onclick={handleDeliver} disabled={loading}>
    {loading ? 'Processing...' : '📦 Submit & Prove'}
  </button>

  {#if status}
    <div class="status-box">
      <strong>Status:</strong> {status}

      {#if evidenceHash}
        <div style="margin-top: 10px">
          <strong>SHA-256 Proof:</strong>
          <span class="hash-text">{evidenceHash}</span>
        </div>
      {/if}

      {#if ipfsCid}
        <div style="margin-top: 10px">
          <strong>IPFS CID:</strong>
          <span class="hash-text">{ipfsCid}</span>
        </div>
      {/if}
    </div>
  {/if}
</div>
