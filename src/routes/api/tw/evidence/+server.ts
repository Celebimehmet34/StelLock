import { json, error } from '@sveltejs/kit';
import { recordEvidenceTx } from '$lib/server/stellar-client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { escrowId, evidenceHash, secretKey } = await request.json();

	if (!escrowId || !evidenceHash) throw error(400, 'Missing escrowId or evidenceHash');
	if (!secretKey) throw error(401, 'Not authenticated — please log in again');

	try {
		const result = await recordEvidenceTx(escrowId, evidenceHash, secretKey);
		return json(result);
	} catch (e) {
		console.error('[TW evidence]', e);
		throw error(500, 'Transaction failed: ' + (e instanceof Error ? e.message : e));
	}
};
