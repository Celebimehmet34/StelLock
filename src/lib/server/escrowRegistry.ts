/**
 * Server-side escrow registry.
 *
 * Tracks each escrow so that:
 *  - release sends the CORRECT per-escrow amount (not the whole shared vault)
 *  - only the buyer who funded an escrow can release it
 *  - an escrow can't be released twice
 *
 * Storage: <project>/data/escrows.json (gitignored).
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface EscrowRecord {
	escrowId: string;
	buyerPublicKey: string;
	sellerPublicKey: string;
	amount: string; // USDC amount entered by buyer
	xlmLocked: string; // actual XLM moved to vault for this escrow
	termsHash: string;
	evidenceHash?: string;
	status: 'funded' | 'delivered' | 'released';
	createdAt: number;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(HERE, '../../../data');
const ESCROWS_FILE = path.join(DATA_DIR, 'escrows.json');

async function readAll(): Promise<Record<string, EscrowRecord>> {
	try {
		return JSON.parse(await fs.readFile(ESCROWS_FILE, 'utf-8'));
	} catch {
		return {};
	}
}

async function writeAll(escrows: Record<string, EscrowRecord>): Promise<void> {
	await fs.mkdir(DATA_DIR, { recursive: true });
	await fs.writeFile(ESCROWS_FILE, JSON.stringify(escrows, null, 2), 'utf-8');
}

export async function getEscrow(escrowId: string): Promise<EscrowRecord | null> {
	const all = await readAll();
	return all[escrowId] ?? null;
}

export async function createEscrow(record: EscrowRecord): Promise<void> {
	const all = await readAll();
	all[record.escrowId] = record;
	await writeAll(all);
}

export async function updateEscrow(
	escrowId: string,
	patch: Partial<EscrowRecord>
): Promise<EscrowRecord> {
	const all = await readAll();
	const existing = all[escrowId];
	if (!existing) throw new Error('ESCROW_NOT_FOUND');
	all[escrowId] = { ...existing, ...patch };
	await writeAll(all);
	return all[escrowId];
}
