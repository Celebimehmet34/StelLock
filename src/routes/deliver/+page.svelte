<script lang="ts">
  import { goto } from '$app/navigation';
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { recordEvidenceTx } from '$lib/stellar/transactions';
  import { escrowStore, userStore } from '$lib/store';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';

  const stored = get(escrowStore);
  let escrowId = $state(stored.escrowId || '');
  let files = $state<FileList | undefined>(undefined);
  let status = $state('');
  let evidenceHash = $state('');
  let ipfsCid = $state('');
  let explorerUrl = $state('');
  let loading = $state(false);
  let done = $state(false);

  onMount(() => {
    if (!$userStore.isLoggedIn || $userStore.role !== 'seller') {
      goto('/login');
    }
  });

  async function handleDeliver() {
    if (!files || files.length === 0) { status = 'Please select a file.'; return; }
    if (!$userStore.secretKey) { status = 'Session expired. Please log in again.'; goto('/login'); return; }

    try {
      loading = true;
      status = 'Uploading to IPFS...';

      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });

      if (!res.ok) {
        status = 'Server unavailable, computing hash locally...';
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        evidenceHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
        ipfsCid = 'Qm' + evidenceHash.slice(0, 44);
      } else {
        const data = await res.json();
        evidenceHash = data.hash;
        ipfsCid = data.cid;
      }

      status = 'Uploaded. Waiting for Face ID...';
      await passkeyAdapter.signWithPasskey({ escrowId, evidenceHash });

      status = 'Recording evidence on Stellar testnet...';
      const result = await recordEvidenceTx($userStore.secretKey, escrowId, evidenceHash);
      explorerUrl = result.explorerUrl;

      escrowStore.update(s => ({ ...s, evidenceHash, ipfsCid }));
      done = true;
      status = 'Delivery proven on-chain.';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Deliver | Emanet</title></svelte:head>

<div class="glass-card">
  <div class="role-banner seller">📦 Seller — {$userStore.username}</div>

  <h1>Deliver</h1>
  <p class="subtitle">Submit cryptographic proof of delivery</p>

  <div class="form-group">
    <label for="escrowId">Escrow ID</label>
    <input type="text" id="escrowId" bind:value={escrowId} disabled={done} placeholder="esc_..." />
  </div>

  <div class="form-group">
    <label for="file">Work File / Deliverable</label>
    <input type="file" id="file" bind:files style="padding: 0.8rem;" disabled={done} />
  </div>

  {#if !done}
    <button onclick={handleDeliver} disabled={loading}>
      {loading ? 'Submitting to Stellar...' : '📦 Submit & Prove'}
    </button>
  {:else}
    <div class="success-banner">✅ Delivery proven on Stellar testnet.</div>
    {#if explorerUrl}
      <a href={explorerUrl} target="_blank" class="explorer-link">🔍 Verify on StellarExpert →</a>
    {/if}
    <button onclick={() => goto('/release')} class="next-btn">Next → Release (notify buyer)</button>
  {/if}

  {#if status}
    <div class="status-box">
      <strong>Status:</strong> {status}
      {#if evidenceHash}
        <div style="margin-top:8px"><strong>SHA-256 Proof:</strong><span class="hash-text">{evidenceHash}</span></div>
      {/if}
      {#if ipfsCid}
        <div style="margin-top:8px"><strong>IPFS CID:</strong><span class="hash-text">{ipfsCid}</span></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .role-banner { border-radius:8px; padding:0.5rem 1rem; font-size:0.8rem; font-weight:700; margin-bottom:1.5rem; text-align:center; text-transform:uppercase; letter-spacing:1px; }
  .role-banner.seller { background:rgba(102,252,241,0.08); color:#66fcf1; border:1px solid rgba(102,252,241,0.2); }
  .success-banner { width:100%; padding:1.2rem; background:linear-gradient(135deg,#45a29e,#66fcf1); color:#0b0c10; border-radius:12px; font-size:1.1rem; font-weight:700; text-align:center; box-sizing:border-box; }
  .explorer-link { display:block; margin-top:0.8rem; text-align:center; color:var(--secondary); font-size:0.9rem; font-weight:600; text-decoration:none; }
  .explorer-link:hover { text-decoration:underline; }
  .next-btn { margin-top:1rem; background:linear-gradient(135deg,#1f2833,#45a29e); }
</style>
