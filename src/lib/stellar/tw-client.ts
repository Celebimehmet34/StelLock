/**
 * Trustless Work client — calls server-side endpoints that sign and submit
 * real Stellar testnet transactions using Node.js native crypto (no polyfill issues).
 */

export interface EscrowResult {
	txHash: string;
	explorerUrl: string;
}

export const tw = {
	async fundEscrow(
		secretKey: string,
		escrowId: string,
		termsHash: string,
		amount: string,
		sellerPublicKey?: string
	): Promise<EscrowResult> {
		const res = await fetch('/api/tw/fund', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ escrowId, termsHash, amount, secretKey, sellerPublicKey })
		});
		if (!res.ok) throw new Error(await res.text());
		return res.json();
	},

	async setEvidence(
		secretKey: string,
		escrowId: string,
		evidenceHash: string
	): Promise<EscrowResult> {
		const res = await fetch('/api/tw/evidence', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ escrowId, evidenceHash, secretKey })
		});
		if (!res.ok) throw new Error(await res.text());
		return res.json();
	},

	async releaseEscrow(
		secretKey: string,
		escrowId: string,
		sellerPublicKey?: string
	): Promise<EscrowResult> {
		const res = await fetch('/api/tw/release', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ escrowId, sellerPublicKey, secretKey })
		});
		if (!res.ok) throw new Error(await res.text());
		return res.json();
	}
};
