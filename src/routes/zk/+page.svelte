<script lang="ts">
  import { proveAmountInRange, type AmountProofResult } from '$lib/zk/prover';

  let amount = $state('100');
  let minAmount = $state('50');
  let maxAmount = $state('1000');

  let status = $state('');
  let loading = $state(false);
  let result = $state<AmountProofResult | null>(null);
  let verifyResult = $state<{ valid: boolean } | null>(null);

  async function generate() {
    result = null;
    verifyResult = null;
    try {
      loading = true;
      status = 'Generating Groth16 proof in your browser (amount stays local)...';
      const t0 = performance.now();
      result = await proveAmountInRange(amount, minAmount, maxAmount);
      const ms = Math.round(performance.now() - t0);
      status = `Proof generated in ${ms}ms. The amount (${amount}) is NOT in the public signals.`;
    } catch (e) {
      status = 'Proof failed: ' + (e instanceof Error ? e.message : e) +
        '  — likely the amount is outside [' + minAmount + ', ' + maxAmount + '].';
    } finally {
      loading = false;
    }
  }

  async function verify() {
    if (!result) return;
    try {
      loading = true;
      status = 'Verifying proof on the server...';
      const res = await fetch('/api/zk/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof: result.proof, publicSignals: result.publicSignals })
      });
      if (!res.ok) throw new Error(await res.text());
      verifyResult = await res.json();
      status = verifyResult?.valid
        ? '✅ Verified — the amount is provably within range, and the server never learned it.'
        : '❌ Proof invalid.';
    } catch (e) {
      status = 'Verify error: ' + (e instanceof Error ? e.message : e);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>ZK Proof | Stellock</title></svelte:head>

<div class="glass-card wide">
  <div class="zk-badge">🔬 Zero-Knowledge · Circom + Groth16</div>
  <h1>Confidential Amount Proof</h1>
  <p class="subtitle">Prove the escrow amount is within an agreed bracket — without revealing it.</p>

  <div class="row">
    <div class="form-group">
      <label for="amount">Secret Amount <span class="tag">🔒 private</span></label>
      <input type="number" id="amount" bind:value={amount} />
    </div>
    <div class="form-group">
      <label for="min">Min (public)</label>
      <input type="number" id="min" bind:value={minAmount} />
    </div>
    <div class="form-group">
      <label for="max">Max (public)</label>
      <input type="number" id="max" bind:value={maxAmount} />
    </div>
  </div>

  <button onclick={generate} disabled={loading}>
    {loading ? 'Working...' : '🔬 Generate ZK Proof (in browser)'}
  </button>

  {#if status}
    <div class="status-box">{status}</div>
  {/if}

  {#if result}
    <div class="proof-section">
      <div class="proof-title">Public Signals (what the verifier sees)</div>
      <div class="signal-row"><span>commitment</span><code>{result.publicSignals[0].slice(0, 24)}…</code></div>
      <div class="signal-row"><span>minAmount</span><code>{result.publicSignals[1]}</code></div>
      <div class="signal-row"><span>maxAmount</span><code>{result.publicSignals[2]}</code></div>
      <div class="proof-note">⚠️ Notice: the actual amount is <strong>not</strong> here. It never left your browser.</div>

      <button onclick={verify} disabled={loading} class="verify-btn">✅ Verify Proof on Server</button>

      {#if verifyResult}
        <div class="verdict" class:ok={verifyResult.valid} class:bad={!verifyResult.valid}>
          {verifyResult.valid ? '✅ PROOF VALID — amount is in range, never disclosed' : '❌ PROOF INVALID'}
        </div>
      {/if}
    </div>
  {/if}

  <div class="explain">
    <strong>How it works:</strong>
    <ol>
      <li>A <code>Circom</code> circuit encodes: <em>commitment = Poseidon(amount, salt)</em> AND <em>min ≤ amount ≤ max</em>.</li>
      <li>Your browser generates a <code>Groth16</code> proof using the secret amount + a random salt.</li>
      <li>The server verifies the proof against the verification key — confirming the constraints hold <em>without seeing the amount</em>.</li>
    </ol>
  </div>
</div>

<style>
  .wide { max-width: 620px; }
  .zk-badge { display:inline-block; font-size:0.7rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--secondary); background:rgba(102,252,241,0.1); border:1px solid rgba(102,252,241,0.25); padding:0.3rem 0.7rem; border-radius:20px; margin-bottom:1rem; }
  .row { display:grid; grid-template-columns:2fr 1fr 1fr; gap:0.8rem; }
  .tag { font-size:0.65rem; background:rgba(69,162,158,0.2); color:var(--primary); padding:2px 6px; border-radius:4px; margin-left:4px; }
  .verify-btn { margin-top:1rem; background:linear-gradient(135deg,#1f2833,#45a29e); }
  .proof-section { margin-top:1.5rem; padding:1.2rem; background:rgba(0,0,0,0.25); border:1px solid var(--glass-border); border-radius:12px; }
  .proof-title { font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; color:var(--primary); font-weight:700; margin-bottom:0.8rem; }
  .signal-row { display:flex; justify-content:space-between; align-items:center; padding:0.35rem 0; font-size:0.82rem; border-bottom:1px solid rgba(255,255,255,0.05); }
  .signal-row span { color:var(--text-main); }
  .signal-row code { color:var(--secondary); font-family:monospace; }
  .proof-note { font-size:0.78rem; color:#f0a500; margin-top:0.8rem; line-height:1.5; }
  .verdict { margin-top:1rem; padding:0.9rem; border-radius:10px; text-align:center; font-weight:700; font-size:0.9rem; }
  .verdict.ok { background:rgba(76,175,80,0.15); color:#4caf50; border:1px solid rgba(76,175,80,0.3); }
  .verdict.bad { background:rgba(244,67,54,0.12); color:#f44336; border:1px solid rgba(244,67,54,0.3); }
  .explain { margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--glass-border); font-size:0.82rem; color:var(--text-main); }
  .explain strong { color:var(--text-light); }
  .explain ol { margin:0.6rem 0 0 1.2rem; padding:0; line-height:1.9; }
  .explain code { background:rgba(0,0,0,0.3); padding:1px 5px; border-radius:4px; color:var(--secondary); font-size:0.78rem; }
  .explain em { color:var(--secondary); font-style:normal; }
</style>
