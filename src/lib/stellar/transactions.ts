/**
 * Client-side Stellar transaction builder.
 * Signs with the user's actual keypair — no secrets ever sent to the server.
 */
import { Keypair, Networks, TransactionBuilder, Operation, Asset, BASE_FEE, Memo, Horizon } from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const ESCROW_PUBLIC = 'GAIARG2YRTEFI4GZGVEJQNXCR4KEB5W6VVIAFOWUAUKOTIQ32PRAZAKT';
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

const horizon = new Horizon.Server(HORIZON_URL);

function explorerUrl(hash: string) {
	return `${EXPLORER_BASE}/${hash}`;
}

async function ensureFunded(publicKey: string): Promise<void> {
	try {
		await horizon.loadAccount(publicKey);
	} catch {
		await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
		await new Promise((r) => setTimeout(r, 3000));
	}
}

/** Buyer locks funds → sends XLM to escrow vault, memo = termsHash prefix. */
export async function fundEscrowTx(
	buyerSecretKey: string,
	escrowId: string,
	termsHash: string,
	amount: string
): Promise<{ txHash: string; explorerUrl: string }> {
	const buyer = Keypair.fromSecret(buyerSecretKey);
	await ensureFunded(buyer.publicKey());

	const account = await horizon.loadAccount(buyer.publicKey());
	const xlm = Math.min(parseFloat(amount) * 0.01, 10).toFixed(7);
	const memo = `fund:${escrowId.slice(-6)}:${termsHash.slice(0, 8)}`.slice(0, 28);

	const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
		.addOperation(Operation.payment({ destination: ESCROW_PUBLIC, asset: Asset.native(), amount: xlm }))
		.addMemo(Memo.text(memo))
		.setTimeout(30)
		.build();

	tx.sign(buyer);
	const result = await horizon.submitTransaction(tx);
	return { txHash: result.hash, explorerUrl: explorerUrl(result.hash) };
}

/** Seller records evidence hash on-chain — self-payment with memo = evidenceHash prefix. */
export async function recordEvidenceTx(
	sellerSecretKey: string,
	escrowId: string,
	evidenceHash: string
): Promise<{ txHash: string; explorerUrl: string }> {
	const seller = Keypair.fromSecret(sellerSecretKey);
	await ensureFunded(seller.publicKey());

	const account = await horizon.loadAccount(seller.publicKey());
	const memo = `ev:${escrowId.slice(-6)}:${evidenceHash.slice(0, 16)}`.slice(0, 28);

	const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
		.addOperation(Operation.payment({ destination: seller.publicKey(), asset: Asset.native(), amount: '0.0000100' }))
		.addMemo(Memo.text(memo))
		.setTimeout(30)
		.build();

	tx.sign(seller);
	const result = await horizon.submitTransaction(tx);
	return { txHash: result.hash, explorerUrl: explorerUrl(result.hash) };
}

/** Buyer releases funds → escrow vault sends XLM to seller. */
export async function releaseEscrowTx(
	buyerSecretKey: string,
	sellerPublicKey: string,
	escrowId: string
): Promise<{ txHash: string; explorerUrl: string }> {
	// For demo: escrow vault signs the release — buyer auth is shown via passkey
	// In production: multi-sig (buyer + escrow) would be required
	const escrowSecret = import.meta.env.VITE_ESCROW_SECRET;
	if (!escrowSecret) throw new Error('Escrow secret not configured');

	const escrow = Keypair.fromSecret(escrowSecret);
	const account = await horizon.loadAccount(escrow.publicKey());

	const balance = (account.balances.find((b) => b.asset_type === 'native') as any)?.balance ?? '2';
	const sendAmount = Math.max(parseFloat(balance) - 1.5, 0.0000100).toFixed(7);
	const memo = `release:${escrowId.slice(-8)}`.slice(0, 28);

	const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
		.addOperation(Operation.payment({ destination: sellerPublicKey, asset: Asset.native(), amount: sendAmount }))
		.addMemo(Memo.text(memo))
		.setTimeout(30)
		.build();

	tx.sign(escrow);
	const result = await horizon.submitTransaction(tx);
	return { txHash: result.hash, explorerUrl: explorerUrl(result.hash) };
}
