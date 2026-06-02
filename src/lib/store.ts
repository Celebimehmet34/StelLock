import { writable } from 'svelte/store';

// ── Escrow state (flows deposit → deliver → release) ──────────────────────────
export const escrowStore = writable<{
	escrowId: string;
	evidenceHash: string;
	ipfsCid: string;
	encryptedTermsCid: string;
}>({
	escrowId: '',
	evidenceHash: '',
	ipfsCid: '',
	encryptedTermsCid: ''
});

// ── User session ───────────────────────────────────────────────────────────────
export interface UserSession {
	isLoggedIn: boolean;
	role: 'buyer' | 'seller' | null;
	username: string;
	publicKey: string;
	secretKey: string; // kept in memory only — gone when tab closes
}

function createUserStore() {
	const { subscribe, set, update } = writable<UserSession>({
		isLoggedIn: false,
		role: null,
		username: '',
		publicKey: '',
		secretKey: ''
	});

	return {
		subscribe,
		login(session: Omit<UserSession, 'isLoggedIn'>) {
			set({ ...session, isLoggedIn: true });
			// Persist non-sensitive info across page reloads
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem(
					'emanet_user',
					JSON.stringify({ role: session.role, username: session.username, publicKey: session.publicKey })
				);
				// secretKey stays in memory — never in storage
			}
		},
		logout() {
			set({ isLoggedIn: false, role: null, username: '', publicKey: '', secretKey: '' });
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.removeItem('emanet_user');
			}
		},
		// Restore publicKey / role from sessionStorage on page reload (secretKey is gone)
		restorePublicInfo() {
			if (typeof sessionStorage === 'undefined') return;
			const raw = sessionStorage.getItem('emanet_user');
			if (!raw) return;
			try {
				const saved = JSON.parse(raw);
				update((s) => ({ ...s, ...saved }));
			} catch {}
		}
	};
}

export const userStore = createUserStore();
