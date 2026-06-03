<script lang="ts">
  import { page } from '$app/stores';
  import { tw, type EscrowInfo } from '$lib/stellar/tw-client';
  import { onMount } from 'svelte';

  let escrow = $state<EscrowInfo | null>(null);
  let error = $state('');
  let polling = $state(true);

  const statusIcon: Record<string, string> = { funded: '🔒', delivered: '📦', released: '✅' };
  const statusColor: Record<string, string> = { funded: '#66fcf1', delivered: '#f0a500', released: '#4caf50' };

  function fmt(ts: number) {
    return new Date(ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function load() {
    const id = $page.params.id;
    if (!id) return;
    try {
      escrow = await tw.getEscrow(id);
      if (!escrow) error = 'Escrow not found.';
    } catch (e) {
      error = 'Error: ' + e;
    }
  }

  onMount(() => {
    load();
    const iv = setInterval(() => { if (polling) load(); }, 10000);
    return () => clearInterval(iv);
  });
</script>

<svelte:head><title>Escrow {$page.params.id} | Stellock</title></svelte:head>

<div class="glass-card wide">
  {#if error}
    <h1>Escrow</h1>
    <div class="status-box match-fail">{error}</div>
  {:else if escrow}
    <div class="status-header">
      <span class="big-icon">{statusIcon[escrow.status]}</span>
      <div>
        <h1 class="esc-title">{escrow.escrowId}</h1>
        <span class="status-pill" style="color:{statusColor[escrow.status]}">{escrow.status.toUpperCase()}</span>
      </div>
    </div>

    <div class="timeline">
      <div class="step" class:active={true}>
        <div class="dot done"></div>
        <div><strong>Created</strong><br/><span class="meta">{fmt(escrow.createdAt)}</span></div>
      </div>
      <div class="step" class:active={escrow.status === 'delivered' || escrow.status === 'released'}>
        <div class="dot" class:done={escrow.status === 'delivered' || escrow.status === 'released'}></div>
        <div><strong>Delivered</strong><br/><span class="meta">{escrow.evidenceHash ? escrow.evidenceHash.slice(0,16)+'...' : 'Awaiting seller'}</span></div>
      </div>
      <div class="step" class:active={escrow.status === 'released'}>
        <div class="dot" class:done={escrow.status === 'released'}></div>
        <div><strong>Released</strong><br/><span class="meta">{escrow.status === 'released' ? 'Payment settled' : 'Awaiting buyer approval'}</span></div>
      </div>
    </div>

    <div class="details">
      <div class="row"><span class="label">Amount</span><span class="val">{escrow.amount} USDC</span></div>
      <div class="row"><span class="label">Buyer</span><span class="val mono">{escrow.buyerPublicKey.slice(0,8)}...{escrow.buyerPublicKey.slice(-6)}</span></div>
      <div class="row"><span class="label">Seller</span><span class="val mono">{escrow.sellerPublicKey ? escrow.sellerPublicKey.slice(0,8)+'...'+escrow.sellerPublicKey.slice(-6) : '—'}</span></div>
      {#if escrow.evidenceHash}
        <div class="row"><span class="label">Evidence</span><span class="val mono">{escrow.evidenceHash.slice(0,20)}...</span></div>
      {/if}
      {#if escrow.encryptedTermsCid}
        <div class="row"><span class="label">Terms (IPFS)</span><span class="val mono">{escrow.encryptedTermsCid}</span></div>
      {/if}
    </div>

    <div class="actions">
      {#if escrow.status === 'funded'}
        <a href="/deliver" class="action-btn">📦 Deliver Work</a>
      {/if}
      {#if escrow.status === 'delivered'}
        <a href="/release" class="action-btn">✅ Release Funds</a>
        <a href="/dispute?escrowId={escrow.escrowId}" class="action-btn dispute">⚖️ Dispute</a>
      {/if}
    </div>

    <div class="poll-note">
      {#if polling && escrow.status !== 'released'}
        <span class="pulse">●</span> Auto-refreshing every 10s
      {/if}
    </div>
  {:else}
    <p>Loading...</p>
  {/if}
</div>

<style>
  .wide { max-width:600px; }
  .status-header { display:flex; align-items:center; gap:1rem; margin-bottom:2rem; }
  .big-icon { font-size:2.5rem; }
  .esc-title { margin:0; font-size:1.3rem; color:var(--text-light); font-family:monospace; }
  .status-pill { font-size:0.72rem; font-weight:700; letter-spacing:1px; }
  .timeline { display:flex; gap:0; margin-bottom:2rem; padding:0 0.5rem; }
  .step { flex:1; display:flex; align-items:flex-start; gap:0.5rem; opacity:0.4; transition:opacity 0.3s; }
  .step.active { opacity:1; }
  .dot { width:12px; height:12px; border-radius:50%; border:2px solid var(--glass-border); margin-top:4px; flex-shrink:0; }
  .dot.done { background:var(--secondary); border-color:var(--secondary); }
  .step strong { font-size:0.82rem; color:var(--text-light); }
  .meta { font-size:0.72rem; color:var(--text-main); }
  .details { background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); border-radius:12px; padding:1rem; margin-bottom:1.5rem; }
  .row { display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:0.82rem; }
  .row:last-child { border:none; }
  .label { color:var(--primary); font-weight:600; text-transform:uppercase; font-size:0.7rem; letter-spacing:0.5px; }
  .val { color:var(--text-light); }
  .mono { font-family:monospace; color:var(--secondary); }
  .actions { display:flex; gap:0.8rem; flex-wrap:wrap; }
  .action-btn { flex:1; text-align:center; padding:0.8rem; border-radius:10px; background:linear-gradient(135deg,var(--primary),var(--secondary)); color:var(--bg-color); font-weight:700; font-size:0.9rem; text-decoration:none; transition:opacity 0.2s; }
  .action-btn:hover { opacity:0.85; }
  .action-btn.dispute { background:linear-gradient(135deg,#b71c1c,#f44336); }
  .match-fail { border-color:#f44336; background:rgba(244,67,54,0.1); }
  .poll-note { margin-top:1.5rem; text-align:center; font-size:0.72rem; color:var(--text-main); }
  .pulse { color:#4caf50; animation:blink 2s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
</style>
