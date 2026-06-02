<script lang="ts">
  import { goto } from '$app/navigation';
  import { commitTerms } from '$lib/utils/privacy';
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { tw } from '$lib/stellar/tw-client';
  import { escrowStore } from '$lib/store';

  let amount = $state('100');
  let counterparty = $state('bob_freelancer_key');
  let terms = $state('I will pay 100 USDC for the landing page design. Due in 7 days.');
  let status = $state('');
  let termsHash = $state('');
  let escrowId = $state('');
  let loading = $state(false);
  let done = $state(false);

  async function handleDeposit() {
    try {
      loading = true;
      status = 'Hashing terms...';

      const salt = crypto.randomUUID();
      termsHash = await commitTerms(terms, salt);
      status = 'Terms hashed. Waiting for Face ID...';

      await passkeyAdapter.signWithPasskey({ amount, termsHash });
      status = 'Signed. Locking funds in Trustless Work...';

      escrowId = await tw.fundEscrow('alice', counterparty, amount, termsHash, 'USDC');

      escrowStore.update(s => ({ ...s, escrowId }));
      done = true;
      status = 'Funds locked.';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Deposit | Emanet</title></svelte:head>

<div class="glass-card">
  <h1>Deposit</h1>
  <p class="subtitle">Lock USDC with verifiable privacy</p>

  <div class="form-group">
    <label for="amount">Amount (USDC)</label>
    <input type="number" id="amount" bind:value={amount} disabled={done} />
  </div>

  <div class="form-group">
    <label for="counterparty">Freelancer / Seller Address</label>
    <input type="text" id="counterparty" bind:value={counterparty} disabled={done} />
  </div>

  <div class="form-group">
    <label for="terms">Commercial Terms</label>
    <textarea id="terms" rows="4" bind:value={terms} disabled={done}></textarea>
  </div>

  {#if !done}
    <button onclick={handleDeposit} disabled={loading}>
      {loading ? 'Processing...' : '🔒 Lock with Face ID'}
    </button>
  {:else}
    <div class="success-banner">✅ Funds locked successfully.</div>
    <button onclick={() => goto('/deliver')} style="margin-top: 1rem; background: linear-gradient(135deg, #1f2833, #45a29e);">
      Next → Deliver
    </button>
  {/if}

  {#if status}
    <div class="status-box">
      <strong>Status:</strong> {status}
      {#if termsHash}
        <div style="margin-top:10px"><strong>Privacy Hash:</strong><span class="hash-text">{termsHash}</span></div>
      {/if}
      {#if escrowId}
        <div style="margin-top:10px"><strong>Escrow ID:</strong><span class="hash-text">{escrowId}</span></div>
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
