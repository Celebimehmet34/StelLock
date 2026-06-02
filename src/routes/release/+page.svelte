<script lang="ts">
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { tw, type EscrowInfo } from '$lib/stellar/tw-client';
  import { decryptTerms } from '$lib/utils/privacy';
  import { escrowStore, userStore, historyStore } from '$lib/store';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  const stored = get(escrowStore);
  let escrowId = $state(stored.escrowId || '');
  let escrowInfo = $state<EscrowInfo | null>(null);
  let lookupError = $state('');
  let expectedHash = $state('');
  let sellerPublicKey = $state('');
  let encryptedTermsCid = $state('');
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
      expectedHash = info.evidenceHash;
      sellerPublicKey = info.sellerPublicKey;
      encryptedTermsCid = info.encryptedTermsCid;
      if (info.status === 'released') { lookupError = 'This escrow is already released.'; released = true; }
      else if (info.status === 'funded') lookupError = 'Seller has not delivered yet — nothing to verify.';
    } catch (e) {
      lookupError = 'Lookup failed: ' + e;
    }
  }

  async function verifyFile() {
    if (!files || files.length === 0) return;
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
  }

  async function handleRelease() {
    if (!$userStore.secretKey) { goto('/login'); return; }
    try {
      loading = true;
      status = 'Waiting for Face ID...';
      await passkeyAdapter.signWithPasskey({ action: 'release', escrowId });

      status = 'Releasing funds on Stellar testnet...';
      const result = await tw.releaseEscrow($userStore.secretKey, escrowId, sellerPublicKey || undefined, expectedHash || undefined);
      explorerUrl = result.explorerUrl;

      historyStore.add($userStore.publicKey, {
        type: 'release',
        escrowId,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        meta: { sellerPublicKey: sellerPublicKey || 'default' }
      });

      released = true;
      status = '🎉 Payment settled on Stellar.';
    } catch (e) {
      status = 'Error: ' + (e instanceof Error ? e.message : e);
    } finally {
      loading = false;
    }
  }

  async function handleDecryptTerms() {
    if (!$userStore.secretKey) return;
    const cid = encryptedTermsCid || stored.encryptedTermsCid;
    if (!cid) { decryptedTerms = '(No encrypted terms CID for this escrow)'; showTerms = true; return; }
    try {
      status = 'Fetching encrypted terms from IPFS...';
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      const encrypted = await res.json();
      decryptedTerms = await decryptTerms(encrypted, $userStore.secretKey);
      showTerms = true;
      status = '';
    } catch (e) {
      decryptedTerms = 'Failed to decrypt (only the buyer who created the escrow can): ' + e;
      showTerms = true;
      status = '';
    }
  }
</script>

<svelte:head><title>Release | Emanet</title></svelte:head>

<div class="glass-card">
  <h1>Release</h1>
  <p class="subtitle">Verify work and authorize payment</p>

  <div class="form-group">
    <label for="escrowId">Escrow ID</label>
    <input type="text" id="escrowId" bind:value={escrowId} onblur={lookupEscrow} placeholder="esc_..." />
  </div>

  {#if escrowInfo}
    <div class="escrow-context">
      <div class="ctx-row"><span class="ctx-label">Seller</span><span class="ctx-val">{sellerPublicKey ? sellerPublicKey.slice(0,8)+'...'+sellerPublicKey.slice(-6) : '—'}</span></div>
      <div class="ctx-row"><span class="ctx-label">Amount</span><span class="ctx-val">{escrowInfo.amount} USDC</span></div>
      <div class="ctx-row"><span class="ctx-label">Status</span><span class="ctx-val status-{escrowInfo.status}">{escrowInfo.status}</span></div>
    </div>
  {/if}

  {#if lookupError}
    <div class="status-box" class:match-fail={!released} style="margin-bottom:1.5rem">{lookupError}</div>
  {/if}

  {#if !released}
    <div class="form-group">
      <label for="file">Downloaded Deliverable (verify against chain)</label>
      <input type="file" id="file" bind:files onchange={verifyFile} style="padding:0.8rem;" />
    </div>

    {#if matchStatus}
      <div class="status-box match-box" class:match-ok={isMatch} class:match-fail={!isMatch && expectedHash.length > 0}>
        {matchStatus}
      </div>
    {/if}

    <button onclick={handleDecryptTerms} class="secondary-btn">🔓 Decrypt & View My Terms</button>
    {#if showTerms}
      <div class="terms-box">{decryptedTerms}</div>
    {/if}

    <button onclick={handleRelease} disabled={loading || escrowInfo?.status !== 'delivered' || (expectedHash.length > 0 && !isMatch)}>
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
  .match-box { margin-top:0; margin-bottom:1.5rem; }
  .match-ok { border-color:#45a29e; background:rgba(69,162,158,0.1); }
  .match-fail { border-color:#f44336; background:rgba(244,67,54,0.1); }
  .secondary-btn { background:transparent; border:1px solid rgba(255,255,255,0.15); color:var(--text-main); width:100%; padding:0.8rem; border-radius:10px; font-size:0.9rem; cursor:pointer; margin-top:0; margin-bottom:1rem; box-shadow:none; text-transform:none; letter-spacing:0; transition:border-color 0.2s; }
  .secondary-btn:hover { border-color:var(--secondary); color:var(--secondary); transform:none; }
  .terms-box { background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:1rem; margin-bottom:1rem; font-size:0.85rem; color:var(--text-light); white-space:pre-wrap; word-break:break-word; }
  .success-banner { width:100%; padding:1.2rem; background:linear-gradient(135deg,#45a29e,#66fcf1); color:#0b0c10; border-radius:12px; font-size:1.1rem; font-weight:700; text-align:center; box-sizing:border-box; }
  .explorer-link { display:block; margin-top:0.8rem; text-align:center; color:var(--secondary); font-size:0.9rem; font-weight:600; text-decoration:none; }
  .explorer-link:hover { text-decoration:underline; }
  .escrow-context { background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:0.9rem; margin-bottom:1.5rem; }
  .ctx-row { display:flex; justify-content:space-between; padding:0.25rem 0; font-size:0.82rem; }
  .ctx-label { color:var(--primary); font-weight:600; text-transform:uppercase; font-size:0.7rem; letter-spacing:0.5px; }
  .ctx-val { color:var(--text-light); font-family:monospace; }
  .status-funded { color:#66fcf1; } .status-delivered { color:#f0a500; } .status-released { color:#4caf50; }
</style>
