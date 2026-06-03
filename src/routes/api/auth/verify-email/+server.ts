import { json, error } from '@sveltejs/kit';
import { confirmEmail, lookupUser } from '$lib/server/userRegistry';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { username, code } = await request.json();

	if (!username?.trim() || !code?.trim()) throw error(400, 'Missing username or code');

	const result = await confirmEmail(username, code);

	if (result === 'no_user') throw error(404, 'No pending registration for that username.');
	if (result === 'expired') throw error(410, 'Code expired. Please register again.');
	if (result === 'wrong_code') throw error(401, 'Incorrect verification code.');
	if (result === 'already_verified') throw error(409, 'Email already verified. Please log in.');

	// Verified — fund the account via Friendbot
	const user = await lookupUser(username);
	if (user) {
		try {
			const check = await fetch(`https://horizon-testnet.stellar.org/accounts/${user.publicKey}`);
			if (!check.ok) await fetch(`https://friendbot.stellar.org?addr=${user.publicKey}`);
		} catch {
			// best-effort
		}
	}

	return json({ ok: true });
};
