import { json, error } from '@sveltejs/kit';
import { fundEscrowTx } from '$lib/server/stellar-client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { escrowId, termsHash, amount, secretKey } = await request.json();

	if (!escrowId || !termsHash) throw error(400, 'Missing escrowId or termsHash');

	try {
		const result = await fundEscrowTx(escrowId, termsHash, amount ?? '100', secretKey);
		return json(result);
	} catch (e) {
		console.error('[TW fund]', e);
		throw error(500, 'Transaction failed: ' + e);
	}
};
