/**
 * Privacy utilities for Stellock.
 *
 * commitTerms  — lightweight on-chain commitment (SHA-256 + salt)
 * encryptTerms — AES-256-GCM encryption keyed from buyer's Stellar secret
 * decryptTerms — reverse of encryptTerms
 *
 * Only the buyer can encrypt / decrypt: the AES key is derived from their
 * Stellar secret key via HKDF-SHA-256. No plaintext ever touches the chain.
 */

// ── Commitment scheme (used as on-chain hash) ─────────────────────────────────

export async function commitTerms(terms: string, salt: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(terms + salt);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

// ── AES-256-GCM: derive key from Stellar secret ───────────────────────────────

async function deriveAesKey(stellarSecretKey: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();

	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(stellarSecretKey),
		'HKDF',
		false,
		['deriveKey']
	);

	return crypto.subtle.deriveKey(
		{
			name: 'HKDF',
			hash: 'SHA-256',
			salt: encoder.encode('stellock-terms-v1'),
			info: encoder.encode('commercial-terms')
		},
		keyMaterial,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

// ── Encrypt ───────────────────────────────────────────────────────────────────

export interface EncryptedTerms {
	encrypted: string; // base64
	iv: string; // base64
}

/**
 * Encrypt commercial terms with the buyer's Stellar secret key.
 * Returns base64-encoded ciphertext + IV — safe to store on IPFS.
 */
export async function encryptTerms(
	terms: string,
	buyerSecretKey: string
): Promise<EncryptedTerms> {
	const key = await deriveAesKey(buyerSecretKey);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoder = new TextEncoder();

	const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(terms));

	return {
		encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
		iv: btoa(String.fromCharCode(...iv))
	};
}

// ── Decrypt ───────────────────────────────────────────────────────────────────

/**
 * Decrypt terms — only works if the caller has the buyer's secret key.
 */
export async function decryptTerms(
	{ encrypted, iv }: EncryptedTerms,
	buyerSecretKey: string
): Promise<string> {
	const key = await deriveAesKey(buyerSecretKey);
	const encryptedBytes = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
	const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

	const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, encryptedBytes);

	return new TextDecoder().decode(decrypted);
}

// ── SHA-256 helper ────────────────────────────────────────────────────────────

export async function sha256hex(data: Uint8Array | string): Promise<string> {
	const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
	const buf = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer);
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
