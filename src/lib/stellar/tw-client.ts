/**
 * Trustless Work client — real Stellar testnet transactions.
 *
 * Each function calls a server-side endpoint that builds, signs,
 * and submits a real Stellar transaction. Returns txHash + explorerUrl
 * so the user can verify on StellarExpert.
 */

export interface EscrowDetails {
	id: string;
	buyer: string;
	seller: string;
	amount: string;
	termsHash: string;
	token: string;
	evidenceHash?: string;
	status: 'funded' | 'delivered' | 'released' | 'disputed';
	txHash?: string;
	explorerUrl?: string;
}

export const tw = {
	/**
	 * Locks funds in escrow → real Stellar transaction (Alice → Escrow account).
	 * Memo encodes termsHash for on-chain privacy proof.
	 */
	async fundEscrow(
		buyer: string,
		seller: string,
		amount: string,
		termsHash: string,
		token: string = 'USDC'
	): Promise<string> {
		const escrowId = 'esc_' + Math.random().toString(36).slice(2, 9);

		const res = await fetch('/api/tw/fund', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ escrowId, termsHash, amount })
		});

		if (!res.ok) throw new Error(await res.text());

		const { txHash, explorerUrl } = await res.json();
		console.log(`[TW] Escrow funded. TX: ${txHash}`);
		console.log(`[TW] Explorer: ${explorerUrl}`);

		// Store explorerUrl in sessionStorage for UI display
		if (typeof window !== 'undefined') {
			sessionStorage.setItem('fund_tx', txHash);
			sessionStorage.setItem('fund_explorer', explorerUrl);
		}

		return escrowId;
	},

	/**
	 * Records delivery evidence hash on Stellar testnet.
	 * Bob sends a self-payment with evidenceHash encoded in memo.
	 */
	async setEvidence(escrowId: string, evidenceHash: string): Promise<boolean> {
		const res = await fetch('/api/tw/evidence', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ escrowId, evidenceHash })
		});

		if (!res.ok) throw new Error(await res.text());

		const { txHash, explorerUrl } = await res.json();
		console.log(`[TW] Evidence recorded. TX: ${txHash}`);
		console.log(`[TW] Explorer: ${explorerUrl}`);

		if (typeof window !== 'undefined') {
			sessionStorage.setItem('evidence_tx', txHash);
			sessionStorage.setItem('evidence_explorer', explorerUrl);
		}

		return true;
	},

	/**
	 * Releases escrowed funds to seller → real Stellar transaction (Escrow → Bob).
	 */
	async releaseEscrow(escrowId: string): Promise<boolean> {
		const res = await fetch('/api/tw/release', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ escrowId })
		});

		if (!res.ok) throw new Error(await res.text());

		const { txHash, explorerUrl } = await res.json();
		console.log(`[TW] Funds released. TX: ${txHash}`);
		console.log(`[TW] Explorer: ${explorerUrl}`);

		if (typeof window !== 'undefined') {
			sessionStorage.setItem('release_tx', txHash);
			sessionStorage.setItem('release_explorer', explorerUrl);
		}

		return true;
	},

	/**
	 * Helper: get explorer URL for a stored transaction.
	 */
	getExplorerUrl(key: 'fund' | 'evidence' | 'release'): string | null {
		if (typeof window === 'undefined') return null;
		return sessionStorage.getItem(`${key}_explorer`);
	}
};
