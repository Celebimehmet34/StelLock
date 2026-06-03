import { json, error } from '@sveltejs/kit';
import { verifyLogin } from '$lib/server/userRegistry';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { username, publicKey } = await request.json();

	if (!username?.trim() || !publicKey) throw error(400, 'Missing username or publicKey');

	const result = await verifyLogin(username, publicKey);

	if (result === 'no_user') throw error(404, 'No account with that username. Please register first.');
	if (result === 'wrong_password') throw error(401, 'Incorrect password.');
	if (result === 'unverified') throw error(403, 'Email not verified. Check your inbox for the code.');

	return json({ ok: true });
};
