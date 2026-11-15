import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { get } from 'svelte/store';

vi.mock('$lib/api/client', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api/client')>();
	return {
		...actual,
		createBook: vi.fn(),
		checkCode: vi.fn(),
		listRecipes: vi.fn(),
		downloadPhoto: vi.fn()
	};
});

import * as api from '$lib/api/client';
import { ApiError, OfflineError } from '$lib/api/client';
import * as db from '$lib/db/database';
import type { Recipe } from '$lib/db/types';
import { getBookCode, setBookCode } from './book';
import { recipes } from './recipes';
import { startNewBook, linkWithCode, unlinkDevice } from './link';

const mocked = vi.mocked(api);

const leftover: Recipe = {
	id: 'oud',
	title: 'Van een ander receptenboek',
	category: 'anders',
	photos: [],
	photoIds: [],
	isFavorite: false,
	createdAt: new Date('2026-01-01T00:00:00.000Z'),
	updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

const onServer = {
	id: 'r1',
	title: 'Erwtensoep',
	category: 'soep' as const,
	photoIds: [],
	isFavorite: false,
	createdAt: '2026-02-01T00:00:00.000Z',
	updatedAt: '2026-02-01T00:00:00.000Z'
};

beforeEach(async () => {
	vi.clearAllMocks();
	mocked.listRecipes.mockResolvedValue([]);
	db.resetDB();
	await new Promise<void>((resolve) => {
		const request = indexedDB.deleteDatabase('receptenapp-db');
		request.onsuccess = request.onerror = request.onblocked = () => resolve();
	});
	localStorage.clear();
	const { clearBookCode } = await import('./book');
	clearBookCode();
	recipes.set([]);
});

describe('startNewBook', () => {
	it('koppelt het apparaat aan een nieuw, leeg receptenboek', async () => {
		await db.putRecipe(leftover);
		mocked.createBook.mockResolvedValue('KOEK4827TAART');

		expect(await startNewBook()).toBe('ok');
		expect(getBookCode()).toBe('KOEK4827TAART');
		expect(await db.getAllRecipes()).toEqual([]);
		expect(get(recipes)).toEqual([]);
	});

	it('meldt offline en koppelt niet als er geen verbinding is', async () => {
		mocked.createBook.mockRejectedValue(new OfflineError());
		expect(await startNewBook()).toBe('offline');
		expect(getBookCode()).toBeNull();
	});

	it('meldt een fout als de server weigert', async () => {
		mocked.createBook.mockRejectedValue(new ApiError(429, 'rate_limited'));
		expect(await startNewBook()).toBe('error');
		expect(getBookCode()).toBeNull();
	});
});

describe('linkWithCode', () => {
	it('koppelt met een code die met kleine letters en spaties is getypt', async () => {
		await db.putRecipe(leftover);
		mocked.checkCode.mockResolvedValue(true);
		mocked.listRecipes.mockResolvedValue([onServer]);

		expect(await linkWithCode(' koek 4827 taart ')).toBe('ok');
		expect(mocked.checkCode).toHaveBeenCalledWith('KOEK4827TAART');
		expect(getBookCode()).toBe('KOEK4827TAART');
		expect(get(recipes).map((r) => r.id)).toEqual(['r1']);
		expect((await db.getAllRecipes()).map((r) => r.id)).toEqual(['r1']);
	});

	it('weigert een code met de verkeerde vorm zonder de server te vragen', async () => {
		expect(await linkWithCode('abc')).toBe('unknown');
		expect(mocked.checkCode).not.toHaveBeenCalled();
		expect(getBookCode()).toBeNull();
	});

	it('meldt onbekend als de server de code niet kent', async () => {
		await db.putRecipe(leftover);
		mocked.checkCode.mockResolvedValue(false);
		expect(await linkWithCode('KOEK4827TAART')).toBe('unknown');
		expect(getBookCode()).toBeNull();
		expect(await db.getAllRecipes()).toHaveLength(1);
	});

	it('meldt offline als er geen verbinding is', async () => {
		mocked.checkCode.mockRejectedValue(new OfflineError());
		expect(await linkWithCode('KOEK4827TAART')).toBe('offline');
		expect(getBookCode()).toBeNull();
	});

	it('meldt een fout als de server te druk is', async () => {
		mocked.checkCode.mockRejectedValue(new ApiError(429, 'rate_limited'));
		expect(await linkWithCode('KOEK4827TAART')).toBe('error');
		expect(getBookCode()).toBeNull();
	});
});

describe('unlinkDevice', () => {
	it('vergeet de code en maakt de lokale kopie leeg', async () => {
		setBookCode('KOEK4827TAART');
		await db.putRecipe(leftover);
		recipes.set([leftover]);

		await unlinkDevice();

		expect(getBookCode()).toBeNull();
		expect(await db.getAllRecipes()).toEqual([]);
		expect(get(recipes)).toEqual([]);
	});
});
