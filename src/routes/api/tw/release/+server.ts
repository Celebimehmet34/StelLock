import { json, error } from '@sveltejs/kit';
import { releaseEscrowTx } from '$lib/server/stellar-client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { escrowId, sellerPublicKey, secretKey, verifiedHash } = await request.json();

	if (!escrowId) throw error(400, 'Missing escrowId');
	if (!secretKey) throw error(401, 'Not authenticated — please log in again');

	try {
		const result = await releaseEscrowTx(escrowId, sellerPublicKey, secretKey, verifiedHash);
		return json(result);
	} catch (e) {
		console.error('[TW release]', e);
		const msg = e instanceof Error ? e.message : String(e);
		if (
			msg.includes('Only the buyer') ||
			msg.includes('already released') ||
			msg.includes('not found') ||
			msg.includes('not delivered') ||
			msg.includes('Verification mismatch')
		) {
			throw error(403, msg);
		}
		throw error(500, 'Transaction failed: ' + msg);
	}
};
