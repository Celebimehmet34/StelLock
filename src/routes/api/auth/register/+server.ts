import { json, error } from '@sveltejs/kit';
import { registerUser } from '$lib/server/userRegistry';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { username, publicKey } = await request.json();

	if (!username?.trim() || !publicKey) throw error(400, 'Missing username or publicKey');

	try {
		const record = await registerUser(username, publicKey);

		// Fund the new account via Friendbot if not already on-chain
		try {
			const check = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
			if (!check.ok) {
				await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
			}
		} catch {
			// best-effort funding; ignore network errors here
		}

		return json({ ok: true, username: record.username, publicKey: record.publicKey });
	} catch (e) {
		if (e instanceof Error && e.message === 'USERNAME_TAKEN') {
			throw error(409, 'Username already taken. Pick another or log in.');
		}
		throw error(500, 'Registration failed: ' + e);
	}
};
