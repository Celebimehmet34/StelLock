<script lang="ts">
  import { goto } from '$app/navigation';
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { tw, type EscrowInfo } from '$lib/stellar/tw-client';
  import { escrowStore, userStore, historyStore } from '$lib/store';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';

  const stored = get(escrowStore);
  let escrowId = $state(stored.escrowId || '');
  let escrowInfo = $state<EscrowInfo | null>(null);
  let lookupError = $state('');
  let files = $state<FileList | undefined>(undefined);
  let status = $state('');
  let evidenceHash = $state('');
  let ipfsCid = $state('');
  let explorerUrl = $state('');
  let loading = $state(false);
  let done = $state(false);

  onMount(() => {
    if (!$userStore.isLoggedIn) goto('/login');
    if (escrowId) lookupEscrow();
  });

  async function lookupEscrow() {
    lookupError = '';
    escrowInfo = null;
    if (!escrowId.trim()) return;
    try {
      const info = await tw.getEscrow(escrowId.trim());
      if (!info) { lookupError = 'No escrow found with that ID.'; return; }
      escrowInfo = info;
      if (info.status === 'released') lookupError = 'This escrow is already released.';
      else if (info.status === 'delivered') lookupError = 'This escrow already has a delivery recorded.';
    } catch (e) {
      lookupError = 'Lookup failed: ' + e;
    }
  }

  async function handleDeliver() {
    if (!files || files.length === 0) { status = 'Please select a file.'; return; }
    if (!$userStore.secretKey) { goto('/login'); return; }

    try {
      loading = true;
      status = 'Uploading to IPFS...';

      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });

      if (!res.ok) {
        status = 'Computing hash locally...';
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        evidenceHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
        ipfsCid = '';
      } else {
        const data = await res.json();
        evidenceHash = data.hash;
        ipfsCid = data.cid;
      }

      status = 'Uploaded. Waiting for Face ID...';
      await passkeyAdapter.signWithPasskey({ escrowId, evidenceHash });

      status = 'Recording evidence on Stellar testnet...';
      const result = await tw.setEvidence($userStore.secretKey, escrowId, evidenceHash, ipfsCid);
      explorerUrl = result.explorerUrl;

      escrowStore.update(s => ({ ...s, escrowId, evidenceHash, ipfsCid }));

      historyStore.add($userStore.publicKey, {
        type: 'deliver',
        escrowId,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        meta: { evidenceHash: evidenceHash.slice(0, 20) + '...', ipfsCid: ipfsCid || '(local)' }
      });

      done = true;
      status = 'Delivery proven on-chain. Notify the buyer to release payment.';
    } catch (e) {
      status = 'Error: ' + (e instanceof Error ? e.message : e);
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
    <label for="escrowId">Escrow ID (from the buyer)</label>
    <input type="text" id="escrowId" bind:value={escrowId} onblur={lookupEscrow} disabled={done} placeholder="esc_..." />
  </div>

  {#if escrowInfo}
    <div class="escrow-context">
      <div class="ctx-row"><span class="ctx-label">Buyer</span><span class="ctx-val">{escrowInfo.buyerPublicKey.slice(0,8)}...{escrowInfo.buyerPublicKey.slice(-6)}</span></div>
      <div class="ctx-row"><span class="ctx-label">Amount</span><span class="ctx-val">{escrowInfo.amount} USDC</span></div>
      <div class="ctx-row"><span class="ctx-label">Status</span><span class="ctx-val status-{escrowInfo.status}">{escrowInfo.status}</span></div>
    </div>
  {/if}

  {#if lookupError}
    <div class="status-box match-fail" style="margin-bottom:1.5rem">{lookupError}</div>
  {/if}

  <div class="form-group">
    <label for="file">Work File / Deliverable</label>
    <input type="file" id="file" bind:files style="padding:0.8rem;" disabled={done} />
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
    <p class="handoff-note">Share the evidence hash below with the buyer so they can verify and release.</p>
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
  .success-banner { width:100%; padding:1.2rem; background:linear-gradient(135deg,#45a29e,#66fcf1); color:#0b0c10; border-radius:12px; font-size:1.1rem; font-weight:700; text-align:center; box-sizing:border-box; }
  .explorer-link { display:block; margin-top:0.8rem; text-align:center; color:var(--secondary); font-size:0.9rem; font-weight:600; text-decoration:none; }
  .explorer-link:hover { text-decoration:underline; }
  .handoff-note { font-size:0.8rem; color:var(--primary); text-align:center; margin-top:1rem; }
  .escrow-context { background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:0.9rem; margin-bottom:1.5rem; }
  .ctx-row { display:flex; justify-content:space-between; padding:0.25rem 0; font-size:0.82rem; }
  .ctx-label { color:var(--primary); font-weight:600; text-transform:uppercase; font-size:0.7rem; letter-spacing:0.5px; }
  .ctx-val { color:var(--text-light); font-family:monospace; }
  .status-funded { color:#66fcf1; } .status-delivered { color:#f0a500; } .status-released { color:#4caf50; }
  .match-fail { border-color:#f44336; background:rgba(244,67,54,0.1); }
</style>
