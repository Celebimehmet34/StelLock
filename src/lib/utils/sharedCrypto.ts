/**
 * Multi-recipient encryption for Emanet.
 *
 * Encrypts data so that BOTH the buyer and the seller can decrypt it, using
 * their Stellar Ed25519 keys (converted to X25519 via ed2curve + NaCl box).
 *
 * - Sealing needs only the recipients' PUBLIC keys → works for any wallet.
 * - Opening needs the recipient's SECRET key (password wallets only;
 *   Freighter doesn't expose secrets for client-side decryption).
 *
 * Scheme: random symmetric key K → secretbox(plaintext, K); K is then
 * box-wrapped to each recipient's X25519 public key with an ephemeral keypair.
 */
import nacl from 'tweetnacl';
import naclutil from 'tweetnacl-util';
import ed2curve from 'ed2curve';
import { Keypair } from '@stellar/stellar-sdk';

const { encodeBase64, decodeBase64 } = naclutil;

function edPubToCurve(stellarPub: string): Uint8Array {
	const edPub = Keypair.fromPublicKey(stellarPub).rawPublicKey();
	const x = ed2curve.convertPublicKey(new Uint8Array(edPub));
	if (!x) throw new Error('Invalid recipient public key');
	return x;
}

function edSecToCurve(stellarSec: string): Uint8Array {
	const seed = new Uint8Array(Keypair.fromSecret(stellarSec).rawSecretKey());
	const full = nacl.sign.keyPair.fromSeed(seed).secretKey; // 64-byte Ed25519 secret
	return ed2curve.convertSecretKey(full);
}

export interface SealedBox {
	v: 1;
	ephPub: string;
	symNonce: string;
	ciphertext: string;
	keys: { pub: string; nonce: string; wrapped: string }[];
}

/** Encrypt bytes for a set of Stellar recipients (by public key). */
export function sealForRecipients(plaintext: Uint8Array, recipientStellarPubs: string[]): SealedBox {
	const K = nacl.randomBytes(32);
	const symNonce = nacl.randomBytes(24);
	const ciphertext = nacl.secretbox(plaintext, symNonce, K);
	const eph = nacl.box.keyPair();

	const keys = recipientStellarPubs
		.filter((p) => !!p)
		.map((pub) => {
			const rx = edPubToCurve(pub);
			const nonce = nacl.randomBytes(24);
			const wrapped = nacl.box(K, nonce, rx, eph.secretKey);
			return { pub, nonce: encodeBase64(nonce), wrapped: encodeBase64(wrapped) };
		});

	return {
		v: 1,
		ephPub: encodeBase64(eph.publicKey),
		symNonce: encodeBase64(symNonce),
		ciphertext: encodeBase64(ciphertext),
		keys
	};
}

/** Decrypt a sealed box using the caller's Stellar keypair. */
export function openSealed(box: SealedBox, myStellarPub: string, myStellarSec: string): Uint8Array {
	const entry = box.keys.find((k) => k.pub === myStellarPub);
	if (!entry) throw new Error('You are not a recipient of this data');
	const sx = edSecToCurve(myStellarSec);
	const K = nacl.box.open(decodeBase64(entry.wrapped), decodeBase64(entry.nonce), decodeBase64(box.ephPub), sx);
	if (!K) throw new Error('Could not unwrap key');
	const pt = nacl.secretbox.open(decodeBase64(box.ciphertext), decodeBase64(box.symNonce), K);
	if (!pt) throw new Error('Could not decrypt');
	return pt;
}

// Convenience helpers for text
export function sealText(text: string, recipients: string[]): SealedBox {
	return sealForRecipients(new TextEncoder().encode(text), recipients);
}
export function openText(box: SealedBox, pub: string, sec: string): string {
	return new TextDecoder().decode(openSealed(box, pub, sec));
}
