import { json, error } from '@sveltejs/kit';
import { getEscrow } from '$lib/server/escrowRegistry';
import type { RequestHandler } from './$types';

/**
 * Public escrow lookup by ID. Lets any party (buyer or seller, on any device)
 * fetch the escrow's current state — instead of relying on client-only memory.
 * Returns only non-sensitive fields (no secrets; terms stay encrypted on IPFS).
 */
export const GET: RequestHandler = async ({ params }) => {
	const escrow = await getEscrow(params.escrowId);
	if (!escrow) throw error(404, 'Escrow not found');

	return json({
		escrowId: escrow.escrowId,
		buyerPublicKey: escrow.buyerPublicKey,
		sellerPublicKey: escrow.sellerPublicKey,
		amount: escrow.amount,
		termsHash: escrow.termsHash,
		encryptedTermsCid: escrow.encryptedTermsCid ?? '',
		evidenceHash: escrow.evidenceHash ?? '',
		ipfsCid: escrow.ipfsCid ?? '',
		status: escrow.status,
		createdAt: escrow.createdAt
	});
};
