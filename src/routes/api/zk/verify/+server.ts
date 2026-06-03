import { json, error } from '@sveltejs/kit';
import * as snarkjs from 'snarkjs';
import vkey from '$lib/server/zk/verification_key.json';
import type { RequestHandler } from './$types';

/**
 * Verifies a Groth16 zero-knowledge proof for the Stellock amount circuit.
 *
 * The prover (buyer) proves, in the browser, that the secret escrow amount:
 *   - matches the public Poseidon commitment, and
 *   - lies within [minAmount, maxAmount]
 * without revealing the amount. The server only sees the proof + public
 * signals (commitment, min, max) — never the amount itself.
 */
export const POST: RequestHandler = async ({ request }) => {
	const { proof, publicSignals } = await request.json();

	if (!proof || !publicSignals) throw error(400, 'Missing proof or publicSignals');

	try {
		const ok = await snarkjs.groth16.verify(vkey, publicSignals, proof);
		return json({
			valid: ok,
			commitment: publicSignals[0],
			minAmount: publicSignals[1],
			maxAmount: publicSignals[2]
		});
	} catch (e) {
		console.error('[ZK verify]', e);
		throw error(500, 'Verification error: ' + (e instanceof Error ? e.message : e));
	}
};
