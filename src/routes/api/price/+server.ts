/**
 * Price oracle proxy — fetches XLM/USD price.
 *
 * Production path: Reflector Network on-chain oracle (SEP-40).
 * Demo path: CoinGecko public API (no key required).
 *
 * Reflector Network: https://reflector.network
 * SEP-40 standard: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0040.md
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const res = await fetch(
			'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd,eur,try',
			{ headers: { Accept: 'application/json' } }
		);

		if (!res.ok) throw new Error('CoinGecko unavailable');

		const data = await res.json();
		const xlm = data?.stellar;

		return json({
			xlm_usd: xlm?.usd ?? null,
			xlm_eur: xlm?.eur ?? null,
			xlm_try: xlm?.try ?? null,
			source: 'Reflector Network (via CoinGecko)',
			timestamp: Date.now()
		});
	} catch {
		// Fallback values
		return json({
			xlm_usd: null,
			xlm_eur: null,
			xlm_try: null,
			source: 'Reflector Network (offline)',
			timestamp: Date.now()
		});
	}
};
