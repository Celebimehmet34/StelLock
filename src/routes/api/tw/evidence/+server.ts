import { json, error } from '@sveltejs/kit';
import { recordEvidenceTx } from '$lib/server/stellar-client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { escrowId, evidenceHash } = await request.json();

	if (!escrowId || !evidenceHash) {
		throw error(400, 'Missing escrowId or evidenceHash');
	}

	try {
		const result = await recordEvidenceTx(escrowId, evidenceHash);
		return json(result);
	} catch (e) {
		console.error('[TW evidence]', e);
		throw error(500, 'Transaction failed: ' + e);
	}
};
