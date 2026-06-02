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
import { createEscrow, getEscrow, updateEscrow } from './escrowRegistry';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new Horizon.Server(HORIZON_URL);

const ESCROW_PUBLIC = 'GAIARG2YRTEFI4GZGVEJQNXCR4KEB5W6VVIAFOWUAUKOTIQ32PRAZAKT';
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

function explorerUrl(hash: string) {
	return `${EXPLORER_BASE}/${hash}`;
}

/** secretKey is REQUIRED — no env fallback. The user's own keypair signs. */
function userKeypair(secretKey?: string): Keypair {
	if (!secretKey) throw new Error('Missing user secret key — please log in again');
	return Keypair.fromSecret(secretKey);
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

/**
 * Buyer locks funds → XLM transfer from buyer to escrow vault.
 * Records the escrow so release can verify ownership and amount.
 */
export async function fundEscrowTx(
	escrowId: string,
	termsHash: string,
	amount: string,
	buyerSecretKey?: string,
	sellerPublicKey?: string
): Promise<{ txHash: string; explorerUrl: string }> {
	const buyer = userKeypair(buyerSecretKey);

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

	// Record the escrow with buyer ownership + locked amount
	await createEscrow({
		escrowId,
		buyerPublicKey: buyer.publicKey(),
		sellerPublicKey: sellerPublicKey ?? '',
		amount,
		xlmLocked: xlm,
		termsHash,
		status: 'funded',
		createdAt: Date.now()
	});

	return { txHash: result.hash, explorerUrl: explorerUrl(result.hash) };
}

/**
 * Seller records evidence hash on-chain via self-payment with memo.
 * Marks the escrow as delivered.
 */
export async function recordEvidenceTx(
	escrowId: string,
	evidenceHash: string,
	sellerSecretKey?: string
): Promise<{ txHash: string; explorerUrl: string }> {
	const seller = userKeypair(sellerSecretKey);

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

	// Best-effort: update escrow status if it exists
	const escrow = await getEscrow(escrowId);
	if (escrow && escrow.status === 'funded') {
		await updateEscrow(escrowId, { evidenceHash, status: 'delivered' });
	}

	return { txHash: result.hash, explorerUrl: explorerUrl(result.hash) };
}

/**
 * Buyer releases funds → escrow vault sends the EXACT locked amount to the seller.
 * Authorization: only the buyer who funded this escrow can release it.
 */
export async function releaseEscrowTx(
	escrowId: string,
	sellerPublicKey: string | undefined,
	buyerSecretKey?: string
): Promise<{ txHash: string; explorerUrl: string }> {
	const buyer = userKeypair(buyerSecretKey);

	// ── Authorization & accounting ──
	const escrow = await getEscrow(escrowId);
	if (!escrow) throw new Error('Escrow not found');
	if (escrow.status === 'released') throw new Error('Escrow already released');
	if (escrow.buyerPublicKey !== buyer.publicKey()) {
		throw new Error('Only the buyer who funded this escrow can release it');
	}

	const destination = sellerPublicKey || escrow.sellerPublicKey;
	if (!destination) throw new Error('No seller address for this escrow');

	const escrowKp = Keypair.fromSecret(env.ESCROW_SECRET);
	const account = await server.loadAccount(escrowKp.publicKey());

	// Send exactly what was locked for THIS escrow (not the whole vault)
	const sendAmount = escrow.xlmLocked;
	const memo = `release:${escrowId.slice(-8)}`.slice(0, 28);

	const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
		.addOperation(Operation.payment({ destination, asset: Asset.native(), amount: sendAmount }))
		.addMemo(Memo.text(memo))
		.setTimeout(30)
		.build();

	tx.sign(escrowKp);
	const result = await server.submitTransaction(tx);

	await updateEscrow(escrowId, { status: 'released' });

	return { txHash: result.hash, explorerUrl: explorerUrl(result.hash) };
}

export { server };
