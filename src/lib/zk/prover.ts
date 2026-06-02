/**
 * Browser-side Groth16 prover for the Emanet amount circuit.
 *
 * Generates the proof entirely in the browser — the secret amount never
 * leaves the device. Only the proof + public signals are sent to the server
 * for verification.
 *
 * Artifacts are served as static assets (built from zk/circuits/amount_proof.circom):
 *   /zk/amount_proof.wasm        — witness generator
 *   /zk/amount_proof_final.zkey  — proving key
 */
import * as snarkjs from 'snarkjs';

export interface AmountProofResult {
	proof: unknown;
	publicSignals: string[]; // [commitment, minAmount, maxAmount]
	commitment: string;
}

/**
 * Prove that `amount` (kept secret) is within [minAmount, maxAmount] and binds
 * to a Poseidon commitment. Returns the proof + public signals.
 */
export async function proveAmountInRange(
	amount: number | string,
	minAmount: number | string,
	maxAmount: number | string,
	salt?: string
): Promise<AmountProofResult> {
	// Random salt so the same amount yields different commitments each time
	const saltValue = salt ?? BigInt('0x' + crypto.randomUUID().replace(/-/g, '')).toString();

	const input = {
		amount: String(amount),
		salt: saltValue,
		minAmount: String(minAmount),
		maxAmount: String(maxAmount)
	};

	const { proof, publicSignals } = await snarkjs.groth16.fullProve(
		input,
		'/zk/amount_proof.wasm',
		'/zk/amount_proof_final.zkey'
	);

	return {
		proof,
		publicSignals: publicSignals as string[],
		commitment: (publicSignals as string[])[0]
	};
}
