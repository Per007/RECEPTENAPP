import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { bookCode, initBook, setBookCode, clearBookCode, getBookCode } from './book';

describe('book store', () => {
	beforeEach(() => {
		localStorage.clear();
		initBook();
	});

	it('is leeg zolang er geen code is', () => {
		expect(getBookCode()).toBeNull();
		expect(get(bookCode)).toBeNull();
	});

	it('bewaart de code genormaliseerd', () => {
		setBookCode(' koek-4827-taart');
		expect(getBookCode()).toBe('KOEK4827TAART');
		expect(get(bookCode)).toBe('KOEK4827TAART');
		expect(localStorage.getItem('receptenboek-code')).toBe('KOEK4827TAART');
	});

	it('leest de code terug uit localStorage', () => {
		localStorage.setItem('receptenboek-code', 'KOEK4827TAART');
		initBook();
		expect(getBookCode()).toBe('KOEK4827TAART');
	});

	it('vergeet de code bij ontkoppelen', () => {
		setBookCode('KOEK4827TAART');
		clearBookCode();
		expect(getBookCode()).toBeNull();
		expect(localStorage.getItem('receptenboek-code')).toBeNull();
	});
});
