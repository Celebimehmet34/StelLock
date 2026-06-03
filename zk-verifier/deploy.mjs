// Deploy the Groth16 verifier contract to Stellar testnet via JS SDK
// (the Rust CLI can't reach the network in this sandbox; node fetch can).
import {
	Keypair, Networks, TransactionBuilder, Operation, BASE_FEE, rpc, hash, Address, xdr
} from '@stellar/stellar-sdk';
import { readFileSync } from 'fs';

const RPC = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC);
const NET = Networks.TESTNET;

const SECRET = process.env.DEPLOYER_SECRET;
if (!SECRET) { console.error('Set DEPLOYER_SECRET'); process.exit(1); }
const kp = Keypair.fromSecret(SECRET);
console.log('Deployer:', kp.publicKey());

const wasm = readFileSync(process.argv[2]);
console.log('WASM size:', wasm.length, 'bytes');

async function submit(tx) {
	const prepared = await server.prepareTransaction(tx);
	prepared.sign(kp);
	const res = await server.sendTransaction(prepared);
	if (res.status === 'ERROR') throw new Error('send error: ' + JSON.stringify(res.errorResult));
	// poll
	let g = await server.getTransaction(res.hash);
	while (g.status === 'NOT_FOUND') {
		await new Promise(r => setTimeout(r, 2000));
		g = await server.getTransaction(res.hash);
	}
	if (g.status !== 'SUCCESS') throw new Error('tx failed: ' + JSON.stringify(g));
	return g;
}

(async () => {
	// 1. Upload WASM
	console.log('\n[1/2] Uploading WASM...');
	let acc = await server.getAccount(kp.publicKey());
	const uploadTx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NET })
		.addOperation(Operation.uploadContractWasm({ wasm }))
		.setTimeout(60).build();
	const uploadRes = await submit(uploadTx);
	const wasmHash = uploadRes.returnValue.bytes();
	console.log('WASM hash:', wasmHash.toString('hex'));

	// 2. Create contract
	console.log('\n[2/2] Creating contract instance...');
	acc = await server.getAccount(kp.publicKey());
	const salt = hash(Buffer.from('emanet-groth16-' + Date.now()));
	const createTx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NET })
		.addOperation(Operation.createCustomContract({
			address: new Address(kp.publicKey()),
			wasmHash,
			salt
		}))
		.setTimeout(60).build();
	const createRes = await submit(createTx);

	const contractAddress = Address.fromScAddress(createRes.returnValue.address()).toString();
	console.log('\n✅ DEPLOYED');
	console.log('Contract ID:', contractAddress);
	console.log('Explorer: https://stellar.expert/explorer/testnet/contract/' + contractAddress);
})().catch(e => { console.error('DEPLOY FAILED:', e.message); process.exit(1); });
