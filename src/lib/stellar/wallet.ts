/**
 * Unified wallet interface — supports both Freighter (real wallet) and
 * deterministic keypair (password-based) login methods.
 *
 * Freighter: non-custodial, secretKey never touches our server.
 * Deterministic: no extension needed, works everywhere.
 */
import {
	isConnected,
	requestAccess,
	getAddress,
	signTransaction,
	getNetworkDetails
} from '@stellar/freighter-api';

export type WalletType = 'freighter' | 'password';

export interface WalletSession {
	type: WalletType;
	publicKey: string;
	// Only set for 'password' type — Freighter signs internally
	secretKey?: string;
}

// ── Freighter ────────────────────────────────────────────────────────────────

export async function isFreighterAvailable(): Promise<boolean> {
	if (typeof window === 'undefined') return false;
	try {
		const result = await isConnected();
		return result?.isConnected ?? false;
	} catch {
		return false;
	}
}

export async function connectFreighter(): Promise<WalletSession> {
	// Check the extension is present first — gives a clear message if not.
	let available = false;
	try {
		const c = await isConnected();
		available = c?.isConnected ?? false;
	} catch {
		available = false;
	}
	if (!available) {
		throw new Error('NOT_INSTALLED');
	}

	const access = await requestAccess();
	if (access.error) throw new Error('Freighter access denied: ' + access.error);

	const addr = await getAddress();
	if (addr.error || !addr.address) throw new Error('Could not get Freighter address');

	return {
		type: 'freighter',
		publicKey: addr.address
	};
}

export async function signWithFreighter(xdr: string, networkPassphrase: string): Promise<string> {
	const result = await signTransaction(xdr, { networkPassphrase });
	if (result.error) throw new Error('Freighter signing failed: ' + result.error);
	return result.signedTxXdr;
}

export async function getFreighterNetwork(): Promise<string> {
	const details = await getNetworkDetails();
	return details.networkPassphrase ?? 'Test SDF Network ; September 2015';
}
