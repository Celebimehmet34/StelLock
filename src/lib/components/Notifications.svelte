<script lang="ts">
  import { onMount } from 'svelte';
  import { userStore, historyStore } from '$lib/store';
  import { tw } from '$lib/stellar/tw-client';

  let notifications = $state<Array<{ id: string; msg: string; type: string }>>([]);

  function addNotification(msg: string, type: string = 'info') {
    const id = Math.random().toString(36).slice(2);
    notifications = [...notifications, { id, msg, type }];
    setTimeout(() => {
      notifications = notifications.filter(n => n.id !== id);
    }, 6000);
  }

  onMount(() => {
    // Poll user's recent escrows for status changes
    let knownStatuses: Record<string, string> = {};

    const iv = setInterval(async () => {
      if (!$userStore.isLoggedIn) return;

      // Get unique escrow IDs from history
      const ids = [...new Set($historyStore.map(t => t.escrowId))].slice(0, 10);

      for (const id of ids) {
        try {
          const esc = await tw.getEscrow(id);
          if (!esc) continue;

          const prev = knownStatuses[id];
          if (prev && prev !== esc.status) {
            if (esc.status === 'delivered') {
              addNotification(`📦 Escrow ${id}: work delivered!`, 'deliver');
            } else if (esc.status === 'released') {
              addNotification(`✅ Escrow ${id}: funds released!`, 'release');
            }
          }
          knownStatuses[id] = esc.status;
        } catch {}
      }
    }, 10000);

    return () => clearInterval(iv);
  });
</script>

{#if notifications.length > 0}
  <div class="toast-container">
    {#each notifications as n (n.id)}
      <div class="toast toast-{n.type}">
        {n.msg}
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container { position:fixed; top:80px; right:1.5rem; z-index:1000; display:flex; flex-direction:column; gap:0.5rem; max-width:360px; }
  .toast { padding:0.8rem 1.2rem; border-radius:10px; font-size:0.85rem; font-weight:600; color:var(--text-light); backdrop-filter:blur(12px); animation:slideIn 0.3s ease; }
  .toast-deliver { background:rgba(240,165,0,0.2); border:1px solid rgba(240,165,0,0.4); }
  .toast-release { background:rgba(76,175,80,0.2); border:1px solid rgba(76,175,80,0.4); }
  .toast-info { background:rgba(102,252,241,0.12); border:1px solid rgba(102,252,241,0.3); }
  @keyframes slideIn { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
</style>
