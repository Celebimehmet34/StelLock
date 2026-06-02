<script lang="ts">
  import { goto } from '$app/navigation';
  import { userStore, historyStore } from '$lib/store';
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { onMount } from 'svelte';

  let escrowId = $state('');
  let reason = $state('');
  let status = $state('');
  let loading = $state(false);
  let done = $state(false);
  let txHash = $state('');

  onMount(() => {
    if (!$userStore.isLoggedIn) goto('/login');

    // Pre-fill from URL param if provided
    const params = new URLSearchParams(window.location.search);
    const id = params.get('escrowId');
    if (id) escrowId = id;
  });

  async function handleDispute() {
    if (!escrowId.trim()) { status = 'Enter an Escrow ID.'; return; }
    if (!reason.trim()) { status = 'Describe the reason for the dispute.'; return; }
    if (!$userStore.secretKey) { goto('/login'); return; }

    try {
      loading = true;
      status = 'Waiting for Face ID confirmation...';

      await passkeyAdapter.signWithPasskey({ action: 'dispute', escrowId, reason });

      status = 'Raising dispute on Stellar testnet...';

      // In production: call TW's dispute_escrow() function
      // The dispute_resolver (arbiter) is then notified and must call resolve_dispute()
      // For demo: simulate the dispute submission
      await new Promise(r => setTimeout(r, 1500));
      txHash = 'dispute_' + Math.random().toString(36).slice(2, 18);

      historyStore.add($userStore.publicKey, {
        type: 'deposit', // reuse type field — in production would be 'dispute'
        escrowId,
        txHash,
        explorerUrl: `https://stellar.expert/explorer/testnet`,
        meta: { action: 'dispute_raised', reason: reason.slice(0, 40) }
      });

      done = true;
      status = 'Dispute submitted. The arbitrator (dispute_resolver) will review and call resolve_dispute().';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Dispute | Emanet</title></svelte:head>

<div class="glass-card">
  <h1>Raise Dispute</h1>
  <p class="subtitle">Involve the arbiter — Trustless Work dispute_resolver</p>

  <div class="info-box">
    <strong>How disputes work:</strong>
    <ol>
      <li>You raise a dispute — escrow is flagged as disputed</li>
      <li>The designated <code>dispute_resolver</code> (arbiter) is notified</li>
      <li>Arbiter reviews evidence and calls <code>resolve_dispute()</code></li>
      <li>Funds are distributed according to the arbiter's decision</li>
    </ol>
    <p>This is Trustless Work's built-in <code>dispute_resolver</code> role — no platform intervention needed.</p>
  </div>

  {#if !done}
    <div class="form-group">
      <label for="escrowId">Escrow ID</label>
      <input type="text" id="escrowId" bind:value={escrowId} placeholder="esc_..." />
    </div>

    <div class="form-group">
      <label for="reason">Reason for Dispute</label>
      <textarea id="reason" rows="4" bind:value={reason} placeholder="Describe what went wrong — incomplete work, non-delivery, quality issues..."></textarea>
    </div>

    <button onclick={handleDispute} disabled={loading} class="dispute-btn">
      {loading ? 'Submitting...' : '⚖️ Raise Dispute'}
    </button>
  {:else}
    <div class="success-banner">⚖️ Dispute raised. Arbiter notified.</div>
    <div class="status-box" style="margin-top:1rem">
      <strong>Next step:</strong> The <code>dispute_resolver</code> will review the on-chain evidence hash and the original terms, then call <code>resolve_dispute()</code> to distribute funds fairly.
    </div>
    <button onclick={() => goto('/history')} style="margin-top:1rem; background:linear-gradient(135deg,#1f2833,#45a29e);">
      View History →
    </button>
  {/if}

  {#if status}
    <div class="status-box"><strong>Status:</strong> {status}</div>
  {/if}
</div>

<style>
  .info-box { background:rgba(255,193,7,0.07); border:1px solid rgba(255,193,7,0.2); border-radius:12px; padding:1.2rem; margin-bottom:1.5rem; font-size:0.82rem; color:var(--text-main); }
  .info-box strong { color:#f0a500; display:block; margin-bottom:0.6rem; }
  .info-box ol { margin:0 0 0.8rem 1.2rem; padding:0; line-height:2; }
  .info-box p { margin:0.6rem 0 0; color:var(--primary); }
  .info-box code { background:rgba(0,0,0,0.3); padding:1px 5px; border-radius:4px; color:var(--secondary); font-size:0.8rem; }
  .dispute-btn { background:linear-gradient(135deg,#b71c1c,#f44336); }
  .dispute-btn:hover { box-shadow:0 15px 25px -10px rgba(244,67,54,0.4); }
  .success-banner { width:100%; padding:1.2rem; background:linear-gradient(135deg,#f0a500,#ffcc02); color:#0b0c10; border-radius:12px; font-size:1.1rem; font-weight:700; text-align:center; box-sizing:border-box; }
</style>
