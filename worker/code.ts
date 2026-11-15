import { WORDS } from './words';

function randomInt(maxExclusive: number): number {
	// Verwerp waarden boven het grootste veelvoud, zodat elke uitkomst even waarschijnlijk is.
	const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
	const buffer = new Uint32Array(1);
	do {
		crypto.getRandomValues(buffer);
	} while (buffer[0] >= limit);
	return buffer[0] % maxExclusive;
}

/** Nieuwe code in genormaliseerde vorm, bijvoorbeeld KOEK4827TAART. */
export function generateCode(): string {
	const digits = String(randomInt(10000)).padStart(4, '0');
	return `${WORDS[randomInt(WORDS.length)]}${digits}${WORDS[randomInt(WORDS.length)]}`;
}

/** SHA-256 van de genormaliseerde code, als hex. */
export async function hashCode(normalized: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
