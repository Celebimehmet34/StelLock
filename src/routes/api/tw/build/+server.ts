/**
 * Build an unsigned Stellar transaction for Freighter signing.
 * The server builds the XDR but does NOT sign — the user signs in Freighter.
 */
import { json, error } from '@sveltejs/kit';
import {
	Networks, TransactionBuilder, Operation, Asset, BASE_FEE, Memo, Horizon
} from '@stellar/stellar-sdk';
import type { RequestHandler } from './$types';

const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const ESCROW_PUBLIC = 'GAIARG2YRTEFI4GZGVEJQNXCR4KEB5W6VVIAFOWUAUKOTIQ32PRAZAKT';

export const POST: RequestHandler = async ({ request }) => {
	const { action, publicKey, escrowId, termsHash, amount, evidenceHash } = await request.json();

	if (!publicKey || !action) throw error(400, 'Missing publicKey or action');

	try {
		await ensureFunded(publicKey);
		const account = await server.loadAccount(publicKey);

		let tx;
		if (action === 'fund') {
			const xlm = Math.min(parseFloat(amount ?? '100') * 0.01, 10).toFixed(7);
			const memo = `fund:${(escrowId ?? '').slice(-6)}:${(termsHash ?? '').slice(0, 8)}`.slice(0, 28);
			tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
				.addOperation(Operation.payment({ destination: ESCROW_PUBLIC, asset: Asset.native(), amount: xlm }))
				.addMemo(Memo.text(memo))
				.setTimeout(30)
				.build();
		} else if (action === 'evidence') {
			const memo = `ev:${(escrowId ?? '').slice(-6)}:${(evidenceHash ?? '').slice(0, 16)}`.slice(0, 28);
			tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
				.addOperation(Operation.payment({ destination: publicKey, asset: Asset.native(), amount: '0.0000100' }))
				.addMemo(Memo.text(memo))
				.setTimeout(30)
				.build();
		} else {
			throw error(400, 'Unknown action: ' + action);
		}

		return json({ xdr: tx.toXDR(), networkPassphrase: Networks.TESTNET });
	} catch (e) {
		console.error('[TW build]', e);
		throw error(500, 'Build failed: ' + (e instanceof Error ? e.message : e));
	}
};

async function ensureFunded(publicKey: string): Promise<void> {
	try { await server.loadAccount(publicKey); } catch {
		await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
		await new Promise(r => setTimeout(r, 3000));
	}
}
