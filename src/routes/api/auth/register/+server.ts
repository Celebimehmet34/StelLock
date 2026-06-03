import { json, error } from '@sveltejs/kit';
import { startRegistration } from '$lib/server/userRegistry';
import { sendVerificationCode } from '$lib/server/email';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { username, email, publicKey } = await request.json();

	if (!username?.trim() || !publicKey) throw error(400, 'Missing username or publicKey');
	if (!email?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw error(400, 'Valid email required');

	try {
		const { code } = await startRegistration(username, email, publicKey);
		const result = await sendVerificationCode(email.trim(), code);

		// In dev mode (no email provider), return the code so the UI can show it.
		return json({ ok: true, emailSent: result.sent, devCode: result.devCode });
	} catch (e) {
		if (e instanceof Error) {
			if (e.message === 'USERNAME_TAKEN') throw error(409, 'Username already taken.');
			if (e.message === 'EMAIL_TAKEN') throw error(409, 'Email already registered.');
			if (e.message === 'ALREADY_REGISTERED') throw error(409, 'Account already exists. Please log in.');
		}
		throw error(500, 'Registration failed: ' + e);
	}
};
