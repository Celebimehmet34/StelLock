import { json, error } from '@sveltejs/kit';
import { releaseEscrowTx } from '$lib/server/stellar-client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { escrowId } = await request.json();

	if (!escrowId) {
		throw error(400, 'Missing escrowId');
	}

	try {
		const result = await releaseEscrowTx(escrowId);
		return json(result);
	} catch (e) {
		console.error('[TW release]', e);
		throw error(500, 'Transaction failed: ' + e);
	}
};
