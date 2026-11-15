// Receptenboek-code: woord, vier cijfers, woord. Gedeeld door de app en de Worker.

/** Hoofdletters; alles behalve A-Z en 0-9 verdwijnt. */
export function normalizeCode(input: string): string {
	return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** KOEK4827TAART -> KOEK-4827-TAART */
export function formatCode(normalized: string): string {
	return normalized.replace(/([A-Z])(?=\d)/g, '$1-').replace(/(\d)(?=[A-Z])/g, '$1-');
}

export function isValidCodeShape(normalized: string): boolean {
	return /^[A-Z]{3,6}\d{4}[A-Z]{3,6}$/.test(normalized);
}
