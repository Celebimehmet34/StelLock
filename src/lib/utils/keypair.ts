/**
 * Deterministic Stellar keypair derivation.
 * username + password → PBKDF2 (SHA-256, 100k iter) → 32-byte seed → Ed25519 keypair
 *
 * Same credentials always produce the same keypair — no seed phrase needed.
 */
import { Keypair } from '@stellar/stellar-sdk';

export async function deriveKeypair(
	username: string,
	password: string
): Promise<{ publicKey: string; secretKey: string }> {
	const encoder = new TextEncoder();

	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);

	const bits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: encoder.encode('stellock-v1:' + username.toLowerCase().trim()),
			iterations: 100000,
			hash: 'SHA-256'
		},
		keyMaterial,
		256
	);

	const seed = Buffer.from(bits);
	const keypair = Keypair.fromRawEd25519Seed(seed);

	return {
		publicKey: keypair.publicKey(),
		secretKey: keypair.secret()
	};
}

/** Fund a new account via Stellar Friendbot (testnet only). */
export async function friendbotFund(publicKey: string): Promise<boolean> {
	try {
		const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
		return res.ok;
	} catch {
		return false;
	}
}

/** Check if a Stellar account exists on testnet Horizon. */
export async function accountExists(publicKey: string): Promise<boolean> {
	try {
		const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
		return res.ok;
	} catch {
		return false;
	}
}
