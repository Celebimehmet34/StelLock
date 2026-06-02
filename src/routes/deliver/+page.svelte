<script lang="ts">
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { tw } from '$lib/stellar/tw-client';

  let escrowId = 'escrow_xyz123';
  let files: FileList;
  let status = '';
  let evidenceHash = '';
  let loading = false;

  async function handleDeliver() {
    if (!files || files.length === 0) {
      status = 'Please select a file to deliver.';
      return;
    }
    
    try {
      loading = true;
      status = 'Generating file hash and uploading to IPFS...';
      
      const file = files[0];
      
      // Calculate SHA-256 using subtle crypto (Client-side simulation)
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      evidenceHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Normally we would call a server endpoint to safely use the Pinata Secret Key
      // e.g. const res = await fetch('/api/upload', { body: formData });
      status = `File hashed. Uploading to IPFS...`;
      await new Promise(r => setTimeout(r, 1000)); // Simulate upload
      const dummyCid = 'QmX...' + Math.random().toString(36).substring(2, 8);
      
      status = `Uploaded (CID: ${dummyCid}). Waiting for Passkey signature...`;

      // Sign transaction
      await passkeyAdapter.signWithPasskey({ escrowId, evidenceHash });
      
      status = 'Signed! Writing delivery proof to smart contract...';
      
      // Update Trustless Work contract
      await tw.setEvidence(escrowId, evidenceHash);

      status = 'Delivery recorded on-chain successfully!';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Deliver | Emanet Infrastructure</title>
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
    <input type="file" id="file" bind:files={files} style="padding: 0.8rem;" />
  </div>

  <button on:click={handleDeliver} disabled={loading}>
    {loading ? 'Processing...' : 'Submit & Prove'}
  </button>

  {#if status}
    <div class="status-box">
      <strong>Status:</strong> {status}
      
      {#if evidenceHash}
        <div style="margin-top: 10px">
          <strong>Cryptographic Proof (SHA-256):</strong>
          <span class="hash-text">{evidenceHash}</span>
        </div>
      {/if}
    </div>
  {/if}
</div>
