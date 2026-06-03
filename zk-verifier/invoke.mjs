// Invoke the on-chain Groth16 verifier with a real proof.
import {
	Keypair, Networks, TransactionBuilder, BASE_FEE, rpc, Contract, xdr, nativeToScVal, scValToNative
} from '@stellar/stellar-sdk';
import { readFileSync } from 'fs';

const RPC = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC);
const NET = Networks.TESTNET;

const SECRET = process.env.DEPLOYER_SECRET;
const CONTRACT = process.env.CONTRACT_ID;
const FP2_SWAP = process.env.FP2_SWAP === '1'; // toggle Fp2 c0/c1 ordering
const kp = Keypair.fromSecret(SECRET);

const proof = JSON.parse(readFileSync(process.argv[2]));
const pub = JSON.parse(readFileSync(process.argv[3]));

function fp(s) { return Buffer.from(BigInt(s).toString(16).padStart(96, '0'), 'hex'); } // 48 bytes

function g1(pt) { return Buffer.concat([fp(pt[0]), fp(pt[1])]); } // 96 bytes

function g2(pt) {
	// snarkjs: [[x_c0, x_c1], [y_c0, y_c1], [z...]]
	const x0 = fp(pt[0][0]), x1 = fp(pt[0][1]);
	const y0 = fp(pt[1][0]), y1 = fp(pt[1][1]);
	// Soroban order: try c0||c1 (default) or c1||c0 (swap)
	if (FP2_SWAP) return Buffer.concat([x1, x0, y1, y0]);
	return Buffer.concat([x0, x1, y0, y1]);
}

const aBytes = g1(proof.pi_a);
const bBytes = g2(proof.pi_b);
const cBytes = g1(proof.pi_c);

console.log('A:', aBytes.length, 'B:', bBytes.length, 'C:', cBytes.length, 'FP2_SWAP:', FP2_SWAP);
console.log('pub:', pub);

const contract = new Contract(CONTRACT);
const args = [
	xdr.ScVal.scvBytes(aBytes),
	xdr.ScVal.scvBytes(bBytes),
	xdr.ScVal.scvBytes(cBytes),
	nativeToScVal(BigInt(pub[0]), { type: 'u64' }),
	nativeToScVal(BigInt(pub[1]), { type: 'u64' })
];

(async () => {
	const acc = await server.getAccount(kp.publicKey());
	const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NET })
		.addOperation(contract.call('verify', ...args))
		.setTimeout(60).build();

	// Simulate first (read-only check, fast)
	const sim = await server.simulateTransaction(tx);
	if (rpc.Api.isSimulationError(sim)) {
		console.error('SIMULATION ERROR:', sim.error);
		process.exit(1);
	}
	const result = scValToNative(sim.result.retval);
	console.log('\n=== ON-CHAIN VERIFY RESULT (simulated) ===');
	console.log(result);

	if (result.verified) {
		console.log('\n✅ ON-CHAIN ZK VERIFICATION SUCCEEDED');
	} else {
		console.log('\n❌ verified=false — check Fp2 ordering or serialization');
	}
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
