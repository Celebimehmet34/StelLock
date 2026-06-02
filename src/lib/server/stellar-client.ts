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

export function getKeypair(secret: string): Keypair {
	return Keypair.fromSecret(secret);
}

export function aliceKeypair(): Keypair {
	return Keypair.fromSecret(env.ALICE_SECRET);
}

export function bobKeypair(): Keypair {
	return Keypair.fromSecret(env.BOB_SECRET);
}

export function escrowKeypair(): Keypair {
	return Keypair.fromSecret(env.ESCROW_SECRET);
}

async function ensureFunded(publicKey: string): Promise<void> {
	try {
		await server.loadAccount(publicKey);
	} catch {
		await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
		await new Promise((r) => setTimeout(r, 3000));
	}
}

/**
 * Alice locks funds → sends XLM to Escrow account.
 * Memo encodes escrowId + termsHash (first 10 chars) for on-chain privacy proof.
 */
export async function fundEscrowTx(
	escrowId: string,
	termsHash: string,
	amount: string
): Promise<{ txHash: string; explorerUrl: string }> {
	const alice = aliceKeypair();
	const escrow = escrowKeypair();

	await ensureFunded(alice.publicKey());
	await ensureFunded(escrow.publicKey());

	const aliceAccount = await server.loadAccount(alice.publicKey());

	// Use a small fixed XLM amount for demo (1 XLM per unit)
	const xlmAmount = Math.min(parseFloat(amount) * 0.01, 10).toFixed(7);
	const memoText = `fund:${escrowId.slice(-6)}:${termsHash.slice(0, 8)}`.slice(0, 28);

	const tx = new TransactionBuilder(aliceAccount, {
		fee: BASE_FEE,
		networkPassphrase: Networks.TESTNET
	})
		.addOperation(
			Operation.payment({
				destination: escrow.publicKey(),
				asset: Asset.native(),
				amount: xlmAmount
			})
		)
		.addMemo(Memo.text(memoText))
		.setTimeout(30)
		.build();

	tx.sign(alice);

	const result = await server.submitTransaction(tx);
	const txHash = result.hash;
	return {
		txHash,
		explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`
	};
}

/**
 * Bob records evidence hash on-chain.
 * Sends a minimal XLM self-payment with memo = first 28 chars of evidenceHash.
 */
export async function recordEvidenceTx(
	escrowId: string,
	evidenceHash: string
): Promise<{ txHash: string; explorerUrl: string }> {
	const bob = bobKeypair();

	await ensureFunded(bob.publicKey());

	const bobAccount = await server.loadAccount(bob.publicKey());
	const memoText = `ev:${escrowId.slice(-6)}:${evidenceHash.slice(0, 16)}`.slice(0, 28);

	const tx = new TransactionBuilder(bobAccount, {
		fee: BASE_FEE,
		networkPassphrase: Networks.TESTNET
	})
		.addOperation(
			Operation.payment({
				destination: bob.publicKey(),
				asset: Asset.native(),
				amount: '0.0000100'
			})
		)
		.addMemo(Memo.text(memoText))
		.setTimeout(30)
		.build();

	tx.sign(bob);

	const result = await server.submitTransaction(tx);
	const txHash = result.hash;
	return {
		txHash,
		explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`
	};
}

/**
 * Escrow releases funds → sends XLM from Escrow to Bob.
 */
export async function releaseEscrowTx(
	escrowId: string
): Promise<{ txHash: string; explorerUrl: string }> {
	const escrow = escrowKeypair();
	const bob = bobKeypair();

	const escrowAccount = await server.loadAccount(escrow.publicKey());
	const balance = escrowAccount.balances.find((b) => b.asset_type === 'native');
	const available = Math.max((parseFloat(balance?.balance ?? '2') - 1.5), 0.0000100).toFixed(7);

	const memoText = `release:${escrowId.slice(-8)}`.slice(0, 28);

	const tx = new TransactionBuilder(escrowAccount, {
		fee: BASE_FEE,
		networkPassphrase: Networks.TESTNET
	})
		.addOperation(
			Operation.payment({
				destination: bob.publicKey(),
				asset: Asset.native(),
				amount: available
			})
		)
		.addMemo(Memo.text(memoText))
		.setTimeout(30)
		.build();

	tx.sign(escrow);

	const result = await server.submitTransaction(tx);
	const txHash = result.hash;
	return {
		txHash,
		explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`
	};
}

export { server };
