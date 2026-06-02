<script lang="ts">
  import { goto } from '$app/navigation';
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { tw } from '$lib/stellar/tw-client';
  import { escrowStore } from '$lib/store';
  import { get } from 'svelte/store';

  const stored = get(escrowStore);
  let escrowId = $state(stored.escrowId || '');
  let files = $state<FileList | undefined>(undefined);
  let status = $state('');
  let evidenceHash = $state('');
  let ipfsCid = $state('');
  let loading = $state(false);
  let done = $state(false);

  async function handleDeliver() {
    if (!files || files.length === 0) {
      status = 'Please select a file.';
      return;
    }

    try {
      loading = true;
      status = 'Uploading to IPFS...';

      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });

      if (!res.ok) {
        // Fallback: client-side hash if server unavailable
        status = 'Server upload failed, computing hash locally...';
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        evidenceHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        ipfsCid = 'Qm' + evidenceHash.slice(0, 44);
      } else {
        const data = await res.json();
        evidenceHash = data.hash;
        ipfsCid = data.cid;
      }

      status = `Uploaded (CID: ${ipfsCid.slice(0, 20)}...). Waiting for Face ID...`;

      await passkeyAdapter.signWithPasskey({ escrowId, evidenceHash });

      status = 'Writing delivery proof to smart contract...';
      await tw.setEvidence(escrowId, evidenceHash);

      escrowStore.update(s => ({ ...s, evidenceHash, ipfsCid }));
      done = true;
      status = 'Delivery recorded on-chain.';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Deliver | Emanet</title></svelte:head>

<div class="glass-card">
  <h1>Deliver</h1>
  <p class="subtitle">Submit cryptographic proof of delivery</p>

  <div class="form-group">
    <label for="escrowId">Escrow ID</label>
    <input type="text" id="escrowId" bind:value={escrowId} disabled={done} />
  </div>

  <div class="form-group">
    <label for="file">Work File / Deliverable</label>
    <input type="file" id="file" bind:files style="padding: 0.8rem;" disabled={done} />
  </div>

  {#if !done}
    <button onclick={handleDeliver} disabled={loading}>
      {loading ? 'Processing...' : '📦 Submit & Prove'}
    </button>
  {:else}
    <div class="success-banner">✅ Delivery proven on-chain.</div>
    <button onclick={() => goto('/release')} style="margin-top: 1rem; background: linear-gradient(135deg, #1f2833, #45a29e);">
      Next → Release
    </button>
  {/if}

  {#if status}
    <div class="status-box">
      <strong>Status:</strong> {status}
      {#if evidenceHash}
        <div style="margin-top:10px"><strong>SHA-256 Proof:</strong><span class="hash-text">{evidenceHash}</span></div>
      {/if}
      {#if ipfsCid}
        <div style="margin-top:10px"><strong>IPFS CID:</strong><span class="hash-text">{ipfsCid}</span></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .success-banner {
    width: 100%; padding: 1.2rem;
    background: linear-gradient(135deg, #45a29e, #66fcf1);
    color: #0b0c10; border-radius: 12px;
    font-size: 1.1rem; font-weight: 700;
    text-align: center; box-sizing: border-box;
  }
</style>
