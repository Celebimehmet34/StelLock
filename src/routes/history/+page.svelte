<script lang="ts">
  import { goto } from '$app/navigation';
  import { userStore, historyStore } from '$lib/store';
  import { onMount } from 'svelte';

  onMount(() => {
    if (!$userStore.isLoggedIn) goto('/login');
  });

  const typeLabel: Record<string, string> = {
    deposit: '🔒 Deposit',
    deliver: '📦 Deliver',
    release: '✅ Release'
  };

  const typeColor: Record<string, string> = {
    deposit: '#45a29e',
    deliver: '#66fcf1',
    release: '#4caf50'
  };

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
</script>

<svelte:head><title>History | Stellock</title></svelte:head>

<div class="history-page">
  <div class="history-header">
    <h1>Transaction History</h1>
    <p class="subtitle">{$userStore.username} · {$userStore.publicKey.slice(0, 8)}...{$userStore.publicKey.slice(-6)}</p>
  </div>

  {#if $historyStore.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <p>No transactions yet.</p>
      <a href="/deposit" class="start-btn">Start with a Deposit →</a>
    </div>
  {:else}
    <div class="tx-list">
      {#each $historyStore as tx (tx.id)}
        <div class="tx-card">
          <div class="tx-header">
            <span class="tx-type" style="color:{typeColor[tx.type]}">{typeLabel[tx.type]}</span>
            <span class="tx-date">{formatDate(tx.timestamp)}</span>
          </div>

          <div class="tx-field">
            <span class="tx-label">Escrow ID</span>
            <span class="tx-value mono">{tx.escrowId}</span>
          </div>

          <div class="tx-field">
            <span class="tx-label">Transaction</span>
            <span class="tx-value mono">{tx.txHash.slice(0,16)}...{tx.txHash.slice(-8)}</span>
          </div>

          {#if tx.meta}
            {#each Object.entries(tx.meta) as [k, v]}
              <div class="tx-field">
                <span class="tx-label">{k}</span>
                <span class="tx-value mono">{v}</span>
              </div>
            {/each}
          {/if}

          <a href={tx.explorerUrl} target="_blank" class="explorer-btn">
            🔍 Verify on StellarExpert →
          </a>
          {#if tx.type === 'deliver'}
            <a href="/dispute?escrowId={tx.escrowId}" class="dispute-btn">
              ⚖️ Raise Dispute
            </a>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .history-page {
    width: 100%;
    max-width: 700px;
    margin: 0 auto;
    padding: 2rem;
    box-sizing: border-box;
  }

  .history-header { margin-bottom: 2rem; }

  h1 { color: var(--text-light); font-size: 2rem; margin: 0 0 0.5rem; }

  .subtitle { color: var(--primary); font-size: 0.85rem; margin: 0; font-family: monospace; }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: var(--panel-bg);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
  }

  .empty-icon { font-size: 3rem; margin-bottom: 1rem; }

  .empty-state p { color: var(--text-main); margin-bottom: 1.5rem; }

  .start-btn {
    display: inline-block;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: var(--bg-color);
    padding: 0.7rem 1.5rem;
    border-radius: 10px;
    text-decoration: none;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .tx-list { display: flex; flex-direction: column; gap: 1rem; }

  .tx-card {
    background: var(--panel-bg);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 1.5rem;
    transition: transform 0.2s;
  }

  .tx-card:hover { transform: translateY(-2px); }

  .tx-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .tx-type { font-weight: 700; font-size: 1rem; }

  .tx-date { font-size: 0.78rem; color: var(--text-main); }

  .tx-field {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .tx-label {
    font-size: 0.72rem;
    color: var(--primary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-width: 100px;
    padding-top: 2px;
  }

  .tx-value {
    font-size: 0.8rem;
    color: var(--text-main);
    word-break: break-all;
  }

  .mono { font-family: monospace; color: var(--secondary); }

  .explorer-btn {
    display: inline-block;
    margin-top: 1rem;
    font-size: 0.82rem;
    color: var(--secondary);
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.2s;
  }

  .explorer-btn:hover { opacity: 0.7; }
  .dispute-btn { display:inline-block; margin-top:0.5rem; margin-left:1rem; font-size:0.82rem; color:#f0a500; text-decoration:none; font-weight:600; transition:opacity 0.2s; }
  .dispute-btn:hover { opacity:0.7; }
</style>
