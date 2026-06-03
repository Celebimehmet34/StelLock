import { PinataSDK } from 'pinata';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

const pinata = new PinataSDK({
	pinataJwt: env.PINATA_JWT || '',
	pinataGateway: 'gateway.pinata.cloud'
});

function sha256(buffer: Buffer): string {
	return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Uploads a file to IPFS via Pinata and returns its CID + SHA-256 hash.
 * The hash is computed locally (always reliable). The IPFS upload is retried
 * once; if it still fails, the caller can decide whether to proceed with the
 * hash-only proof (the on-chain commitment) and an empty CID.
 */
export async function uploadEvidence(file: File): Promise<{ cid: string; hash: string }> {
	const buffer = Buffer.from(await file.arrayBuffer());
	const hash = sha256(buffer);

	if (!env.PINATA_JWT) {
		throw new Error('PINATA_JWT not configured');
	}

	let lastErr: unknown;
	for (let attempt = 1; attempt <= 2; attempt++) {
		try {
			const upload = await (pinata.upload.public as any).file(file);
			return { cid: upload.cid ?? upload.IpfsHash ?? '', hash };
		} catch (e) {
			lastErr = e;
			if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
		}
	}
	throw new Error('Pinata upload failed after retry: ' + lastErr);
}

export async function verifyEvidence(file: File, storedHash: string): Promise<boolean> {
	const buffer = Buffer.from(await file.arrayBuffer());
	return sha256(buffer) === storedHash;
}
