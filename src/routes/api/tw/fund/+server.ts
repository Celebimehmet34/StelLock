import { json, error } from '@sveltejs/kit';
import { fundEscrowTx } from '$lib/server/stellar-client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { escrowId, termsHash, amount, secretKey, sellerPublicKey } = await request.json();

	if (!escrowId || !termsHash) throw error(400, 'Missing escrowId or termsHash');
	if (!secretKey) throw error(401, 'Not authenticated — please log in again');

	try {
		const result = await fundEscrowTx(escrowId, termsHash, amount ?? '100', secretKey, sellerPublicKey);
		return json(result);
	} catch (e) {
		console.error('[TW fund]', e);
		throw error(500, 'Transaction failed: ' + (e instanceof Error ? e.message : e));
	}
};
