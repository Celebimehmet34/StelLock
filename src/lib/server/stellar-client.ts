import {
	Keypair,
	Networks,
	TransactionBuilder,
	Operation,
	Asset,
	BASE_FEE,
	Memo,
	Horizon
} from '@stellar/stellar-sdk';
import { env } from '$env/dynamic/private';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new Horizon.Server(HORIZON_URL);

const ESCROW_PUBLIC = 'GAIARG2YRTEFI4GZGVEJQNXCR4KEB5W6VVIAFOWUAUKOTIQ32PRAZAKT';
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

function explorerUrl(hash: string) {
	return `${EXPLORER_BASE}/${hash}`;
}

/** If user's secretKey is provided, use it. Otherwise fall back to env default. */
function resolveKeypair(secretKey?: string, envKey?: string): Keypair {
	const key = secretKey || env[envKey ?? ''];
	if (!key) throw new Error('No keypair secret available');
	return Keypair.fromSecret(key);
}

async function ensureFunded(publicKey: string): Promise<void> {
	try {
		await server.loadAccount(publicKey);
	} catch {
		console.log(`[Stellar] Funding ${publicKey.slice(0, 8)}... via Friendbot`);
		await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
		await new Promise((r) => setTimeout(r, 3000));
	}
}

/** Buyer locks funds → XLM transfer from buyer to escrow vault. */
export async function fundEscrowTx(
	escrowId: string,
	termsHash: string,
	amount: string,
	buyerSecretKey?: string
): Promise<{ txHash: string; explorerUrl: string }> {
	const buyer = resolveKeypair(buyerSecretKey, 'ALICE_SECRET');

	await ensureFunded(buyer.publicKey());
	await ensureFunded(ESCROW_PUBLIC);

	const account = await server.loadAccount(buyer.publicKey());
	const xlm = Math.min(parseFloat(amount) * 0.01, 10).toFixed(7);
	const memo = `fund:${escrowId.slice(-6)}:${termsHash.slice(0, 8)}`.slice(0, 28);

	const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
		.addOperation(Operation.payment({ destination: ESCROW_PUBLIC, asset: Asset.native(), amount: xlm }))
		.addMemo(Memo.text(memo))
		.setTimeout(30)
		.build();

	tx.sign(buyer);
	const result = await server.submitTransaction(tx);
	return { txHash: result.hash, explorerUrl: explorerUrl(result.hash) };
}

/** Seller records evidence hash on-chain via self-payment with memo. */
export async function recordEvidenceTx(
	escrowId: string,
	evidenceHash: string,
	sellerSecretKey?: string
): Promise<{ txHash: string; explorerUrl: string }> {
	const seller = resolveKeypair(sellerSecretKey, 'BOB_SECRET');

	await ensureFunded(seller.publicKey());

	const account = await server.loadAccount(seller.publicKey());
	const memo = `ev:${escrowId.slice(-6)}:${evidenceHash.slice(0, 16)}`.slice(0, 28);

	const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
		.addOperation(Operation.payment({ destination: seller.publicKey(), asset: Asset.native(), amount: '0.0000100' }))
		.addMemo(Memo.text(memo))
		.setTimeout(30)
		.build();

	tx.sign(seller);
	const result = await server.submitTransaction(tx);
	return { txHash: result.hash, explorerUrl: explorerUrl(result.hash) };
}

/** Escrow vault releases funds to seller. */
export async function releaseEscrowTx(
	escrowId: string,
	sellerPublicKey?: string,
	buyerSecretKey?: string
): Promise<{ txHash: string; explorerUrl: string }> {
	const escrow = Keypair.fromSecret(env.ESCROW_SECRET);
	const destination = sellerPublicKey || Keypair.fromSecret(env.BOB_SECRET).publicKey();

	const account = await server.loadAccount(escrow.publicKey());
	const balance = (account.balances.find((b) => b.asset_type === 'native') as any)?.balance ?? '2';
	const sendAmount = Math.max(parseFloat(balance) - 1.5, 0.0000100).toFixed(7);
	const memo = `release:${escrowId.slice(-8)}`.slice(0, 28);

	const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
		.addOperation(Operation.payment({ destination, asset: Asset.native(), amount: sendAmount }))
		.addMemo(Memo.text(memo))
		.setTimeout(30)
		.build();

	tx.sign(escrow);
	const result = await server.submitTransaction(tx);
	return { txHash: result.hash, explorerUrl: explorerUrl(result.hash) };
}

export { server };
