<script lang="ts">
  import { commitTerms } from '$lib/utils/privacy';
  import { passkeyAdapter } from '$lib/stellar/passkey-adapter';
  import { tw } from '$lib/stellar/tw-client';

  let amount = '100';
  let counterparty = 'bob_freelancer_key';
  let terms = 'I will pay 100 USDC for the landing page design. Due in 7 days.';
  
  let status = '';
  let termsHash = '';
  let escrowId = '';
  let loading = false;

  async function handleDeposit() {
    try {
      loading = true;
      status = 'Hashing terms...';
      
      // Step 1: Hash terms to ensure privacy on-chain
      const salt = crypto.randomUUID();
      termsHash = await commitTerms(terms, salt);
      status = 'Terms hashed securely. Waiting for Passkey signature...';

      // Step 2: Sign with Passkey (Biometric)
      const signature = await passkeyAdapter.signWithPasskey({ amount, termsHash });
      status = `Signed with Face ID (Sig: ${signature.substring(0,10)}...). Locking funds...`;

      // Step 3: Call Trustless Work SDK to lock funds
      escrowId = await tw.fundEscrow('alice', counterparty, amount, termsHash, 'USDC');
      
      status = 'Success! Funds locked in Trustless Work escrow.';
    } catch (e) {
      status = 'Error: ' + e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Deposit | Emanet Infrastructure</title>
</svelte:head>

<div class="glass-card">
  <h1>Deposit</h1>
  <p class="subtitle">Lock USDC with verifiable privacy</p>

  <div class="form-group">
    <label for="amount">Amount (USDC)</label>
    <input type="number" id="amount" bind:value={amount} />
  </div>

  <div class="form-group">
    <label for="counterparty">Freelancer / Seller</label>
    <input type="text" id="counterparty" bind:value={counterparty} />
  </div>

  <div class="form-group">
    <label for="terms">Commercial Terms</label>
    <textarea id="terms" rows="4" bind:value={terms}></textarea>
  </div>

  <button on:click={handleDeposit} disabled={loading}>
    {loading ? 'Processing...' : 'Lock with Face ID'}
  </button>

  {#if status}
    <div class="status-box">
      <strong>Status:</strong> {status}
      
      {#if termsHash}
        <div style="margin-top: 10px">
          <strong>Privacy Hash (On-Chain):</strong>
          <span class="hash-text">{termsHash}</span>
        </div>
      {/if}

      {#if escrowId}
        <div style="margin-top: 10px">
          <strong>Escrow ID:</strong>
          <span class="hash-text">{escrowId}</span>
        </div>
      {/if}
    </div>
  {/if}
</div>
