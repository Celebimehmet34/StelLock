import { json, error } from '@sveltejs/kit';
import { uploadEvidence } from '$lib/server/evidence';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();
	const file = formData.get('file');

	if (!file || typeof file === 'string') {
		throw error(400, 'No file provided');
	}

	try {
		const result = await uploadEvidence(file);
		return json({ cid: result.cid, hash: result.hash });
	} catch (e) {
		throw error(500, 'IPFS upload failed: ' + e);
	}
};
