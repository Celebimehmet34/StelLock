/**
 * Fetch a Stellar account's balances from Horizon testnet.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const pk = params.publicKey;
	try {
		const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${pk}`);
		if (!res.ok) {
			// Account not funded yet
			return json({ funded: false, balances: [], xlm: '0' });
		}
		const data = await res.json();
		const balances = (data.balances ?? []).map((b: any) => ({
			asset: b.asset_type === 'native' ? 'XLM' : (b.asset_code ?? 'unknown'),
			balance: b.balance
		}));
		const native = balances.find((b: any) => b.asset === 'XLM');
		return json({ funded: true, balances, xlm: native?.balance ?? '0' });
	} catch (e) {
		return json({ funded: false, balances: [], xlm: '0', error: String(e) });
	}
};
