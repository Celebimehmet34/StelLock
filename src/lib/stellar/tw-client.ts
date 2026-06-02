/**
 * Trustless Work client — calls server-side endpoints that sign and submit
 * real Stellar testnet transactions using Node.js native crypto (no polyfill issues).
 */

export interface EscrowResult {
	txHash: string;
	explorerUrl: string;
}

export interface EscrowInfo {
	escrowId: string;
	buyerPublicKey: string;
	sellerPublicKey: string;
	amount: string;
	termsHash: string;
	encryptedTermsCid: string;
	evidenceHash: string;
	ipfsCid: string;
	status: 'funded' | 'delivered' | 'released';
	createdAt: number;
}

export const tw = {
	async fundEscrow(
		secretKey: string,
		escrowId: string,
		termsHash: string,
		amount: string,
		sellerPublicKey?: string,
		encryptedTermsCid?: string,
		zkCommitment?: string
	): Promise<EscrowResult> {
		const res = await fetch('/api/tw/fund', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ escrowId, termsHash, amount, secretKey, sellerPublicKey, encryptedTermsCid, zkCommitment })
		});
		if (!res.ok) throw new Error(await res.text());
		return res.json();
	},

	async setEvidence(
		secretKey: string,
		escrowId: string,
		evidenceHash: string,
		ipfsCid?: string
	): Promise<EscrowResult> {
		const res = await fetch('/api/tw/evidence', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ escrowId, evidenceHash, secretKey, ipfsCid })
		});
		if (!res.ok) throw new Error(await res.text());
		return res.json();
	},

	async releaseEscrow(
		secretKey: string,
		escrowId: string,
		sellerPublicKey?: string,
		verifiedHash?: string
	): Promise<EscrowResult> {
		const res = await fetch('/api/tw/release', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ escrowId, sellerPublicKey, secretKey, verifiedHash })
		});
		if (!res.ok) throw new Error(await res.text());
		return res.json();
	},

	/** Look up an escrow by ID from the server (works for any party, any device). */
	async getEscrow(escrowId: string): Promise<EscrowInfo | null> {
		const res = await fetch(`/api/escrow/${encodeURIComponent(escrowId)}`);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error(await res.text());
		return res.json();
	}
};
