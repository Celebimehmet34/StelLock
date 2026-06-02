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
		return `emanet_history_${publicKey}`;
	}

	return {
		subscribe,
		load(publicKey: string) {
			if (typeof localStorage === 'undefined') return;
			try {
				const raw = localStorage.getItem(storageKey(publicKey));
				set(raw ? JSON.parse(raw) : []);
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
export interface UserSession {
	isLoggedIn: boolean;
	username: string;
	publicKey: string;
	secretKey: string;
}

function createUserStore() {
	const { subscribe, set, update } = writable<UserSession>({
		isLoggedIn: false,
		username: '',
		publicKey: '',
		secretKey: ''
	});

	return {
		subscribe,
		login(session: Omit<UserSession, 'isLoggedIn'>) {
			set({ ...session, isLoggedIn: true });
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem(
					'emanet_user',
					JSON.stringify({ username: session.username, publicKey: session.publicKey })
				);
			}
			historyStore.load(session.publicKey);
		},
		logout() {
			set({ isLoggedIn: false, username: '', publicKey: '', secretKey: '' });
			historyStore.clear();
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.removeItem('emanet_user');
			}
		},
		restorePublicInfo() {
			if (typeof sessionStorage === 'undefined') return;
			const raw = sessionStorage.getItem('emanet_user');
			if (!raw) return;
			try {
				const saved = JSON.parse(raw);
				update((s) => ({ ...s, ...saved }));
				if (saved.publicKey) historyStore.load(saved.publicKey);
			} catch {}
		}
	};
}

export const userStore = createUserStore();
