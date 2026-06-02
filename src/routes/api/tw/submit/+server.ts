/**
 * Submit a signed transaction XDR to Stellar testnet.
 * Used after Freighter signing — the user signs locally, we just relay.
 */
import { json, error } from '@sveltejs/kit';
import { TransactionBuilder, Horizon, Networks } from '@stellar/stellar-sdk';
import type { RequestHandler } from './$types';

const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const EXPLORER = 'https://stellar.expert/explorer/testnet/tx';

export const POST: RequestHandler = async ({ request }) => {
	const { signedXdr } = await request.json();

	if (!signedXdr) throw error(400, 'Missing signedXdr');

	try {
		const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
		const result = await server.submitTransaction(tx);
		return json({
			txHash: result.hash,
			explorerUrl: `${EXPLORER}/${result.hash}`
		});
	} catch (e) {
		console.error('[TW submit]', e);
		throw error(500, 'Submit failed: ' + (e instanceof Error ? e.message : e));
	}
};
