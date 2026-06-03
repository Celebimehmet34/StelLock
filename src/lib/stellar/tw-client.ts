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
		zkCommitment?: string,
		zkRange?: { min: number; max: number }
	): Promise<EscrowResult> {
		const res = await fetch('/api/tw/fund', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ escrowId, termsHash, amount, secretKey, sellerPublicKey, encryptedTermsCid, zkCommitment, zkRange })
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

	/**
	 * Freighter flow: build unsigned tx on server → sign in Freighter → submit.
	 * Returns txHash + explorerUrl just like the password-based methods.
	 */
	async freighterTransact(
		action: string,
		publicKey: string,
		params: Record<string, string>,
		signFn: (xdr: string, networkPassphrase: string) => Promise<string>
	): Promise<EscrowResult> {
		// 1. Build unsigned tx
		const buildRes = await fetch('/api/tw/build', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action, publicKey, ...params })
		});
		if (!buildRes.ok) throw new Error(await buildRes.text());
		const { xdr, networkPassphrase } = await buildRes.json();

		// 2. Sign with Freighter
		const signedXdr = await signFn(xdr, networkPassphrase);

		// 3. Submit
		const submitRes = await fetch('/api/tw/submit', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ signedXdr })
		});
		if (!submitRes.ok) throw new Error(await submitRes.text());
		return submitRes.json();
	},

	/** Look up an escrow by ID from the server (works for any party, any device). */
	async getEscrow(escrowId: string): Promise<EscrowInfo | null> {
		const res = await fetch(`/api/escrow/${encodeURIComponent(escrowId)}`);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error(await res.text());
		return res.json();
	}
};
