import { Keypair, Networks, TransactionBuilder, BASE_FEE, rpc, Contract, xdr, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
const server = new rpc.Server('https://soroban-testnet.stellar.org');
const kp = Keypair.fromSecret(process.env.DEPLOYER_SECRET);
const CONTRACT = process.env.CONTRACT_ID;

const pointHex = process.argv[2];
const scalar = process.argv[3] || '2';
const point = Buffer.from(pointHex, 'hex');
console.log('point len:', point.length, 'scalar:', scalar);

const c = new Contract(CONTRACT);
const tx = new TransactionBuilder(await server.getAccount(kp.publicKey()), { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addOperation(c.call('dbg_mul', xdr.ScVal.scvBytes(point), nativeToScVal(BigInt(scalar), { type: 'u64' })))
  .setTimeout(60).build();

const sim = await server.simulateTransaction(tx);
if (rpc.Api.isSimulationError(sim)) { console.error('ERR:', sim.error.split('\n')[0]); process.exit(1); }
console.log('OK result:', Buffer.from(scValToNative(sim.result.retval)).toString('hex').slice(0,32), '...');
