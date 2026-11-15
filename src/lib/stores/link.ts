// Een apparaat koppelen aan een receptenboek, of weer ontkoppelen.
import { writable } from 'svelte/store';
import * as api from '$lib/api/client';
import { OfflineError } from '$lib/api/client';
import { isValidCodeShape, normalizeCode } from '$lib/api/code';
import * as db from '$lib/db/database';
import { clearBookCode, setBookCode } from './book';
import { loadRecipes, recipes } from './recipes';

export type LinkResult = 'ok' | 'unknown' | 'offline' | 'error';

export const LINK_MESSAGES: Record<Exclude<LinkResult, 'ok'>, string> = {
	unknown: 'Deze code kennen we niet. Controleer de code en probeer het opnieuw.',
	offline: 'Voor de eerste keer instellen is internet nodig.',
	error: 'Dat is niet gelukt. Probeer het over een minuut opnieuw.'
};

/** Melding die het welkomstscherm toont, bijvoorbeeld na een mislukte QR-koppeling. */
export const linkMessage = writable<string | null>(null);

function failure(error: unknown): LinkResult {
	return error instanceof OfflineError ? 'offline' : 'error';
}

/** De lokale kopie hoort bij het vorige receptenboek; begin schoon met het nieuwe. */
async function switchTo(code: string): Promise<void> {
	await db.clearRecipes();
	recipes.set([]);
	setBookCode(code);
	await loadRecipes();
}

export async function startNewBook(): Promise<LinkResult> {
	let code: string;
	try {
		code = await api.createBook();
	} catch (error) {
		return failure(error);
	}
	await switchTo(code);
	return 'ok';
}

export async function linkWithCode(input: string): Promise<LinkResult> {
	const code = normalizeCode(input);
	if (!isValidCodeShape(code)) return 'unknown';

	try {
		if (!(await api.checkCode(code))) return 'unknown';
	} catch (error) {
		return failure(error);
	}
	await switchTo(code);
	return 'ok';
}

/** De recepten op de server blijven bestaan; alleen dit apparaat vergeet ze. */
export async function unlinkDevice(): Promise<void> {
	await db.clearRecipes();
	clearBookCode();
	recipes.set([]);
}
