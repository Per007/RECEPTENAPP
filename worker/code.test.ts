import { describe, it, expect } from 'vitest';
import { WORDS } from './words';
import { generateCode, hashCode } from './code';
import { isValidCodeShape } from '../src/lib/api/code';

describe('WORDS', () => {
	it('bevat geen dubbele woorden', () => {
		expect(new Set(WORDS).size).toBe(WORDS.length);
	});
	it('bevat minstens 512 woorden', () => {
		expect(WORDS.length).toBeGreaterThanOrEqual(512);
	});
	it('bevat alleen woorden van 3 tot 6 hoofdletters', () => {
		expect(WORDS.filter((w) => !/^[A-Z]{3,6}$/.test(w))).toEqual([]);
	});
});

describe('generateCode', () => {
	it('geeft een code in de juiste vorm', () => {
		expect(isValidCodeShape(generateCode())).toBe(true);
	});
	it('geeft elke keer een andere code', () => {
		expect(generateCode()).not.toBe(generateCode());
	});
});

describe('hashCode', () => {
	it('geeft een sha-256 hex', async () => {
		expect(await hashCode('KOEK4827TAART')).toMatch(/^[0-9a-f]{64}$/);
	});
	it('is stabiel', async () => {
		expect(await hashCode('KOEK4827TAART')).toBe(await hashCode('KOEK4827TAART'));
	});
});
