import { describe, it, expect } from 'vitest';
import { normalizeCode, formatCode, isValidCodeShape } from './code';

describe('normalizeCode', () => {
	it('maakt hoofdletters en haalt spaties weg', () => {
		expect(normalizeCode(' koek 4827 taart ')).toBe('KOEK4827TAART');
	});
	it('haalt streepjes weg', () => {
		expect(normalizeCode('Koek-4827-Taart')).toBe('KOEK4827TAART');
	});
});

describe('formatCode', () => {
	it('zet streepjes tussen letters en cijfers', () => {
		expect(formatCode('KOEK4827TAART')).toBe('KOEK-4827-TAART');
	});
});

describe('isValidCodeShape', () => {
	it('accepteert woord, vier cijfers, woord', () => {
		expect(isValidCodeShape('KOEK4827TAART')).toBe(true);
	});
	it('weigert drie cijfers', () => {
		expect(isValidCodeShape('KOEK482TAART')).toBe(false);
	});
	it('weigert een lege code', () => {
		expect(isValidCodeShape('')).toBe(false);
	});
});
