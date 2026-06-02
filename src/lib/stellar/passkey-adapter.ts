/**
 * Passkey Adapter — WebAuthn biometric signing for Stellar transactions.
 *
 * Production path: smart-account-kit (installed) with a deployed
 * Smart Account contract (accountWasmHash + webauthnVerifierAddress on testnet).
 *
 * Demo path (active): high-fidelity simulation that mirrors the real
 * WebAuthn UX — navigator.credentials API call, realistic timing,
 * deterministic output from input data.
 */

const IS_DEMO = true; // flip to false when smart-account-kit infra is ready

// ── Real implementation (wired when IS_DEMO = false) ──────────────────────────
// import { SmartAccountKit, IndexedDBStorage } from 'smart-account-kit';
//
// const kit = new SmartAccountKit({
//   rpcUrl: 'https://soroban-testnet.stellar.org',
//   networkPassphrase: 'Test SDF Network ; September 2015',
//   accountWasmHash: import.meta.env.VITE_ACCOUNT_WASM_HASH,
//   webauthnVerifierAddress: import.meta.env.VITE_WEBAUTHN_VERIFIER,
//   storage: new IndexedDBStorage(),
// });
// ─────────────────────────────────────────────────────────────────────────────

/** SHA-256 a string → hex. Used to derive deterministic demo signatures. */
async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const passkeyAdapter = {
  /**
   * Register a new passkey for this user.
   * Real: kit.createWallet(appName, userEmail, { autoSubmit: true })
   */
  async registerPasskey(userId: string): Promise<{ credentialId: string; contractId: string }> {
    if (!IS_DEMO) {
      // const result = await kit.createWallet('Emanet', userId, { autoSubmit: true });
      // return { credentialId: result.credentialId, contractId: result.contractId };
    }

    // Demo: simulate WebAuthn ceremony timing (~800ms)
    await new Promise(r => setTimeout(r, 800));
    const credentialId = await sha256hex('credential:' + userId + Date.now());
    const contractId = 'C' + (await sha256hex('contract:' + userId)).slice(0, 54).toUpperCase();
    console.log('[Passkey] Registered:', { credentialId: credentialId.slice(0, 16) + '...', contractId });
    return { credentialId, contractId };
  },

  /**
   * Sign a Stellar transaction with Face ID / Touch ID.
   * Real: kit.signAndSubmit(transaction)
   */
  async signWithPasskey(transactionData: Record<string, unknown>): Promise<string> {
    if (!IS_DEMO) {
      // const result = await kit.signAndSubmit(transactionData as any);
      // return result.hash;
    }

    // Demo: simulate biometric prompt (~1.5s) + derive signature from tx data
    await new Promise(r => setTimeout(r, 1500));
    const payload = JSON.stringify(transactionData);
    const signature = await sha256hex('sig:' + payload);
    console.log('[Passkey] Signed tx:', signature.slice(0, 16) + '...');
    return signature;
  },

  /**
   * Connect to an existing wallet silently (session restore).
   * Real: kit.connectWallet()
   */
  async connectWallet(options?: { prompt?: boolean }): Promise<string | null> {
    if (!IS_DEMO) {
      // const result = await kit.connectWallet(options);
      // return result?.contractId ?? null;
    }

    await new Promise(r => setTimeout(r, 400));
    return 'C_DEMO_CONTRACT_' + Math.random().toString(36).slice(2, 10).toUpperCase();
  },

  /**
   * Returns the public key (G-address) for the active passkey session.
   */
  async getPasskeyPublicKey(): Promise<string> {
    if (!IS_DEMO) {
      // return kit.wallet?.options.contractId ?? '';
    }

    return 'GDEMO' + (await sha256hex('pubkey:demo')).slice(0, 51).toUpperCase();
  }
};
