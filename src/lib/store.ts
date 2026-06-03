import { writable } from 'svelte/store';

// ── Escrow state (flows deposit → deliver → release) ──────────────────────────
export const escrowStore = writable<{
	escrowId: string;
	evidenceHash: string;
	ipfsCid: string;
	encryptedTermsCid: string;
	sellerPublicKey: string;
}>({
	escrowId: '',
	evidenceHash: '',
	ipfsCid: '',
	encryptedTermsCid: '',
	sellerPublicKey: ''
});

// ── Transaction history ────────────────────────────────────────────────────────
export interface TxRecord {
	id: string;
	type: 'deposit' | 'deliver' | 'release';
	escrowId: string;
	txHash: string;
	explorerUrl: string;
	timestamp: number;
	meta?: Record<string, string>; // evidenceHash, ipfsCid, etc.
}

function createHistoryStore() {
	const { subscribe, set, update } = writable<TxRecord[]>([]);

	function storageKey(publicKey: string) {
		return `stellock_history_${publicKey}`;
	}

	return {
		subscribe,
		load(publicKey: string) {
			if (typeof localStorage === 'undefined') return;
			try {
				const raw = localStorage.getItem(storageKey(publicKey));
				const parsed = raw ? JSON.parse(raw) : [];
				set(Array.isArray(parsed) ? parsed : []);
			} catch {
				set([]);
			}
		},
		add(publicKey: string, record: Omit<TxRecord, 'id' | 'timestamp'>) {
			const entry: TxRecord = {
				...record,
				id: Math.random().toString(36).slice(2),
				timestamp: Date.now()
			};
			update((list) => {
				const next = [entry, ...list];
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem(storageKey(publicKey), JSON.stringify(next));
				}
				return next;
			});
		},
		clear() {
			set([]);
		}
	};
}

export const historyStore = createHistoryStore();

// ── User session ───────────────────────────────────────────────────────────────
export type WalletType = 'freighter' | 'password';

export interface UserSession {
	isLoggedIn: boolean;
	walletType: WalletType;
	username: string;
	publicKey: string;
	secretKey: string; // empty for freighter — it signs internally
}

function createUserStore() {
	const { subscribe, set, update } = writable<UserSession>({
		isLoggedIn: false,
		walletType: 'password',
		username: '',
		publicKey: '',
		secretKey: ''
	});

	return {
		subscribe,
		login(session: Omit<UserSession, 'isLoggedIn'>) {
			set({ ...session, isLoggedIn: true });
			// sessionStorage survives refresh, clears on tab close.
			// secretKey is already transmitted to the server for signing, so storing
			// it here adds no new exposure — and it keeps the session usable on reload.
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem('stellock_session', JSON.stringify(session));
			}
			historyStore.load(session.publicKey);
		},
		logout() {
			set({ isLoggedIn: false, walletType: 'password', username: '', publicKey: '', secretKey: '' });
			historyStore.clear();
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.removeItem('stellock_session');
			}
		},
		/** Restore the full session on page reload (within the same tab). */
		restore() {
			if (typeof sessionStorage === 'undefined') return;
			const raw = sessionStorage.getItem('stellock_session');
			if (!raw) return;
			try {
				const saved = JSON.parse(raw) as Omit<UserSession, 'isLoggedIn'>;
				if (saved.publicKey && saved.secretKey) {
					set({ ...saved, isLoggedIn: true });
					historyStore.load(saved.publicKey);
				}
			} catch {}
		}
	};
}

export const userStore = createUserStore();
