/**
 * On-chain ZK verification: takes a snarkjs BLS12-381 Groth16 proof,
 * serializes it, and calls the deployed Soroban verifier contract.
 *
 * This is REAL on-chain verification — the Soroban contract runs the
 * BLS12-381 pairing check via Protocol 22 host functions.
 */
import { json, error } from '@sveltejs/kit';
import {
	Keypair, Networks, TransactionBuilder, BASE_FEE, rpc, Contract, xdr, nativeToScVal, scValToNative
} from '@stellar/stellar-sdk';
import { env } from '$env/dynamic/private';
import { env as pubEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

const RPC = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC);

function fp(s: string): Buffer {
	return Buffer.from(BigInt(s).toString(16).padStart(96, '0'), 'hex');
}
function g1(pt: string[]): Buffer {
	return Buffer.concat([fp(pt[0]), fp(pt[1])]);
}
function g2(pt: string[][]): Buffer {
	// Soroban G2 order: X_c1 || X_c0 || Y_c1 || Y_c0
	return Buffer.concat([fp(pt[0][1]), fp(pt[0][0]), fp(pt[1][1]), fp(pt[1][0])]);
}

export const POST: RequestHandler = async ({ request }) => {
	const { proof, publicSignals } = await request.json();
	const contractId = pubEnv.PUBLIC_ZK_VERIFIER_CONTRACT;
	const secret = env.DEPLOYER_SECRET;

	if (!contractId || !secret) throw error(500, 'Verifier contract not configured');
	if (!proof || !publicSignals) throw error(400, 'Missing proof or publicSignals');

	try {
		const kp = Keypair.fromSecret(secret);
		const aBytes = g1(proof.pi_a);
		const bBytes = g2(proof.pi_b);
		const cBytes = g1(proof.pi_c);

		const contract = new Contract(contractId);
		const args = [
			xdr.ScVal.scvBytes(aBytes),
			xdr.ScVal.scvBytes(bBytes),
			xdr.ScVal.scvBytes(cBytes),
			nativeToScVal(BigInt(publicSignals[0]), { type: 'u64' }),
			nativeToScVal(BigInt(publicSignals[1]), { type: 'u64' })
		];

		const acc = await server.getAccount(kp.publicKey());
		const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
			.addOperation(contract.call('verify', ...args))
			.setTimeout(60)
			.build();

		const sim = await server.simulateTransaction(tx);
		if (rpc.Api.isSimulationError(sim)) {
			throw new Error('Simulation error: ' + sim.error.split('\n')[0]);
		}

		const result = scValToNative(sim.result!.retval) as { verified: boolean; min_amount: bigint; max_amount: bigint };

		return json({
			verified: result.verified,
			minAmount: result.min_amount.toString(),
			maxAmount: result.max_amount.toString(),
			contractId,
			explorerUrl: `https://stellar.expert/explorer/testnet/contract/${contractId}`,
			onChain: true
		});
	} catch (e) {
		console.error('[ZK verify-onchain]', e);
		throw error(500, 'On-chain verification failed: ' + (e instanceof Error ? e.message : e));
	}
};
