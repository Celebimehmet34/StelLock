/**
 * Server-side user registry.
 *
 * Since keypairs are derived deterministically (username + password → keypair),
 * we store username → publicKey. On login we re-derive the keypair from the
 * submitted credentials and check the publicKey matches. This verifies the
 * password WITHOUT ever storing it.
 *
 * Storage: a JSON file at <project>/data/users.json (gitignored).
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface UserRecord {
	username: string;
	publicKey: string;
	createdAt: number;
}

// Resolve <project>/data relative to this module (src/lib/server/) — robust
// against process.cwd() differences between dev, build, and sandboxed runs.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(HERE, '../../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

async function readAll(): Promise<Record<string, UserRecord>> {
	try {
		const raw = await fs.readFile(USERS_FILE, 'utf-8');
		return JSON.parse(raw);
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

/** Returns the record if username exists, else null. */
export async function lookupUser(username: string): Promise<UserRecord | null> {
	const users = await readAll();
	return users[normalize(username)] ?? null;
}

/**
 * Register a new user.
 * Throws if username already taken (by a different publicKey).
 * Idempotent if the same username+publicKey re-registers.
 */
export async function registerUser(username: string, publicKey: string): Promise<UserRecord> {
	const key = normalize(username);
	const users = await readAll();

	const existing = users[key];
	if (existing) {
		if (existing.publicKey === publicKey) return existing; // same creds, idempotent
		throw new Error('USERNAME_TAKEN');
	}

	const record: UserRecord = { username: key, publicKey, createdAt: Date.now() };
	users[key] = record;
	await writeAll(users);
	return record;
}

/**
 * Verify login: username must exist AND the derived publicKey must match.
 * Returns 'ok' | 'no_user' | 'wrong_password'.
 */
export async function verifyLogin(
	username: string,
	derivedPublicKey: string
): Promise<'ok' | 'no_user' | 'wrong_password'> {
	const record = await lookupUser(username);
	if (!record) return 'no_user';
	if (record.publicKey !== derivedPublicKey) return 'wrong_password';
	return 'ok';
}
