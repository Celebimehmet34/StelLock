import { writable } from 'svelte/store';

export const escrowStore = writable<{
	escrowId: string;
	evidenceHash: string;
	ipfsCid: string;
}>({
	escrowId: '',
	evidenceHash: '',
	ipfsCid: '',
});
