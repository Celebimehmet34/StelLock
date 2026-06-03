/**
 * Server-side user registry.
 *
 * Keypairs are derived deterministically (username + password → keypair),
 * so we store username → publicKey. On login we re-derive the keypair and
 * check the publicKey matches — verifying the password without storing it.
 *
 * Email verification: registration creates a PENDING user with a 6-digit code.
 * The account is only usable after the code is confirmed (emailVerified=true).
 *
 * Storage: <project>/data/users.json (gitignored).
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface UserRecord {
	username: string;
	email: string;
	publicKey: string;
	emailVerified: boolean;
	pendingCode?: string; // present only while unverified
	codeExpiresAt?: number;
	createdAt: number;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(HERE, '../../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

async function readAll(): Promise<Record<string, UserRecord>> {
	try {
		return JSON.parse(await fs.readFile(USERS_FILE, 'utf-8'));
	} catch {
		return {};
	}
}

async function writeAll(users: Record<string, UserRecord>): Promise<void> {
	await fs.mkdir(DATA_DIR, { recursive: true });
	await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function normalize(username: string): string {
	return username.toLowerCase().trim();
}

function genCode(): string {
	return String(Math.floor(100000 + Math.random() * 900000));
}

export async function lookupUser(username: string): Promise<UserRecord | null> {
	const users = await readAll();
	return users[normalize(username)] ?? null;
}

/**
 * Start registration: create a pending (unverified) user with a verification code.
 * Returns the code so the caller can email it (or show it in dev mode).
 * Throws USERNAME_TAKEN / EMAIL_TAKEN if already used by a verified account.
 */
export async function startRegistration(
	username: string,
	email: string,
	publicKey: string
): Promise<{ code: string }> {
	const key = normalize(username);
	const users = await readAll();

	const existing = users[key];
	if (existing && existing.emailVerified) {
		if (existing.publicKey === publicKey) throw new Error('ALREADY_REGISTERED');
		throw new Error('USERNAME_TAKEN');
	}

	// email uniqueness among verified accounts
	const emailNorm = email.toLowerCase().trim();
	for (const u of Object.values(users)) {
		if (u.emailVerified && u.email === emailNorm && u.username !== key) {
			throw new Error('EMAIL_TAKEN');
		}
	}

	const code = genCode();
	users[key] = {
		username: key,
		email: emailNorm,
		publicKey,
		emailVerified: false,
		pendingCode: code,
		codeExpiresAt: Date.now() + 10 * 60 * 1000, // 10 min
		createdAt: Date.now()
	};
	await writeAll(users);
	return { code };
}

/**
 * Confirm the verification code. Marks the account verified on success.
 * Returns 'ok' | 'no_user' | 'expired' | 'wrong_code' | 'already_verified'.
 */
export async function confirmEmail(username: string, code: string): Promise<string> {
	const key = normalize(username);
	const users = await readAll();
	const u = users[key];
	if (!u) return 'no_user';
	if (u.emailVerified) return 'already_verified';
	if (!u.codeExpiresAt || Date.now() > u.codeExpiresAt) return 'expired';
	if (u.pendingCode !== code.trim()) return 'wrong_code';

	u.emailVerified = true;
	delete u.pendingCode;
	delete u.codeExpiresAt;
	users[key] = u;
	await writeAll(users);
	return 'ok';
}

/**
 * Verify login: username must exist, be email-verified, and the derived
 * publicKey must match.
 * Returns 'ok' | 'no_user' | 'wrong_password' | 'unverified'.
 */
export async function verifyLogin(
	username: string,
	derivedPublicKey: string
): Promise<'ok' | 'no_user' | 'wrong_password' | 'unverified'> {
	const record = await lookupUser(username);
	if (!record) return 'no_user';
	if (record.publicKey !== derivedPublicKey) return 'wrong_password';
	if (!record.emailVerified) return 'unverified';
	return 'ok';
}
