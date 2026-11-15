import { get, writable, type Readable } from 'svelte/store';
import { normalizeCode } from '$lib/api/code';

// De receptenboek-code waaraan dit apparaat gekoppeld is.
const STORAGE_KEY = 'receptenboek-code';

const code = writable<string | null>(null);

export const bookCode: Readable<string | null> = { subscribe: code.subscribe };

function storage(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}

/** Leest de code uit localStorage. Aanroepen bij het starten van de app. */
export function initBook(): void {
	code.set(storage()?.getItem(STORAGE_KEY) || null);
}

export function setBookCode(value: string): void {
	const normalized = normalizeCode(value);
	storage()?.setItem(STORAGE_KEY, normalized);
	code.set(normalized);
}

export function clearBookCode(): void {
	storage()?.removeItem(STORAGE_KEY);
	code.set(null);
}

export function getBookCode(): string | null {
	return get(code);
}
