/**
 * Browser-side Groth16 prover for the Stellock range circuit.
 *
 * Generates the proof entirely in the browser — the secret amount never
 * leaves the device. Only the proof + public signals are sent to the server,
 * which forwards them to the on-chain Soroban verifier (BLS12-381).
 *
 * Two circuits are available:
 *  - bn128 (amount_proof) — fast, off-chain verification
 *  - bls12381 (range_proof_bls) — verified ON-CHAIN by the Soroban contract
 *
 * We default to BLS12-381 so the proof can be verified on Stellar.
 */
import * as snarkjs from 'snarkjs';

export interface AmountProofResult {
	proof: unknown;
	publicSignals: string[]; // [minAmount, maxAmount]
	commitment: string;
	curve: 'bls12381' | 'bn128';
}

/**
 * Prove that `amount` (secret) is within [minAmount, maxAmount].
 * Uses the BLS12-381 circuit so the proof is verifiable on-chain.
 */
export async function proveAmountInRange(
	amount: number | string,
	minAmount: number | string,
	maxAmount: number | string
): Promise<AmountProofResult> {
	const input = {
		amount: String(amount),
		minAmount: String(minAmount),
		maxAmount: String(maxAmount)
	};

	const { proof, publicSignals } = await snarkjs.groth16.fullProve(
		input,
		'/zk/range_proof_bls.wasm',
		'/zk/rp_final.zkey'
	);

	const signals = publicSignals as string[];

	// Commitment for display = hash of the proof's A point (deterministic id)
	const commitment = (proof as { pi_a: string[] }).pi_a[0].slice(0, 32);

	return {
		proof,
		publicSignals: signals,
		commitment,
		curve: 'bls12381'
	};
}
