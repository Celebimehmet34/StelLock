import { json, error } from '@sveltejs/kit';
import { recordEvidenceTx } from '$lib/server/stellar-client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { escrowId, evidenceHash, secretKey, ipfsCid } = await request.json();

	if (!escrowId || !evidenceHash) throw error(400, 'Missing escrowId or evidenceHash');
	if (!secretKey) throw error(401, 'Not authenticated — please log in again');

	try {
		const result = await recordEvidenceTx(escrowId, evidenceHash, secretKey, ipfsCid);
		return json(result);
	} catch (e) {
		console.error('[TW evidence]', e);
		const msg = e instanceof Error ? e.message : String(e);
		if (msg.includes('Only the designated seller') || msg.includes('Escrow not found') || msg.includes('already released') || msg.includes('cannot deliver')) {
			throw error(403, msg);
		}
		throw error(500, 'Transaction failed: ' + msg);
	}
};
