<script lang="ts">
  // Global escrow flow progress indicator.
  // active: which step the user is on (1=deposit, 2=deliver, 3=release)
  let { active = 1 }: { active?: number } = $props();

  const steps = [
    { n: 1, label: 'Deposit', icon: '🔒' },
    { n: 2, label: 'Deliver', icon: '📦' },
    { n: 3, label: 'Release', icon: '✅' }
  ];
</script>

<div class="progress">
  {#each steps as s, i}
    <div class="step" class:active={s.n === active} class:done={s.n < active}>
      <div class="circle">
        {#if s.n < active}✓{:else}{s.icon}{/if}
      </div>
      <div class="label">{s.label}</div>
    </div>
    {#if i < steps.length - 1}
      <div class="connector" class:filled={s.n < active}></div>
    {/if}
  {/each}
</div>

<style>
  .progress { display:flex; align-items:center; justify-content:center; gap:0; margin:0 auto 2rem; max-width:480px; }
  .step { display:flex; flex-direction:column; align-items:center; gap:0.4rem; opacity:0.4; transition:opacity 0.3s; }
  .step.active, .step.done { opacity:1; }
  .circle {
    width:42px; height:42px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:1.1rem; border:2px solid var(--glass-border);
    background:var(--panel-bg); transition:all 0.3s;
  }
  .step.active .circle {
    border-color:var(--secondary);
    box-shadow:0 0 0 4px rgba(102,252,241,0.15);
    background:rgba(102,252,241,0.08);
  }
  .step.done .circle {
    background:linear-gradient(135deg,var(--primary),var(--secondary));
    border-color:var(--secondary); color:var(--bg-color); font-weight:800;
  }
  .label { font-size:0.75rem; font-weight:600; color:var(--text-main); }
  .step.active .label { color:var(--secondary); }
  .connector { flex:1; height:2px; background:var(--glass-border); margin:0 0.5rem; margin-bottom:1.4rem; max-width:60px; transition:background 0.3s; }
  .connector.filled { background:linear-gradient(90deg,var(--primary),var(--secondary)); }
</style>
