import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { get } from 'svelte/store';

vi.mock('$lib/api/client', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api/client')>();
	return {
		...actual,
		listRecipes: vi.fn(),
		saveRecipe: vi.fn(),
		removeRecipe: vi.fn(),
		uploadPhoto: vi.fn(),
		downloadPhoto: vi.fn()
	};
});

import * as api from '$lib/api/client';
import { ApiError, OfflineError } from '$lib/api/client';
import * as db from '$lib/db/database';
import type { RecipeInput, RemoteRecipe } from '$lib/api/types';
import { setBookCode, clearBookCode } from './book';
import {
	recipes,
	error,
	isLoading,
	loadRecipes,
	addRecipe,
	updateRecipe,
	deleteRecipe,
	toggleFavorite,
	tryToggleFavorite,
	notice,
	importRecipes,
	deleteAllRecipes,
	SAVE_FAILED,
	ImportError,
	type NewRecipe
} from './recipes';

const mocked = vi.mocked(api);
const calls: string[] = [];

/** De nep-server bewaart wat hij krijgt en geeft het terug zoals de echte dat doet. */
let serverClock = 0;
function serverSave(id: string, input: RecipeInput): RemoteRecipe {
	serverClock += 1000;
	const stamp = new Date(Date.UTC(2026, 0, 1) + serverClock).toISOString();
	const { createdAt, ...fields } = input;
	return { ...fields, id, createdAt: createdAt ?? stamp, updatedAt: stamp };
}

const soep: NewRecipe = {
	title: 'Erwtensoep',
	category: 'soep',
	ingredients: ['erwten'],
	photos: [],
	isFavorite: false
};

beforeEach(async () => {
	calls.length = 0;
	vi.clearAllMocks();
	mocked.listRecipes.mockResolvedValue([]);
	mocked.saveRecipe.mockImplementation(async (id, input) => {
		calls.push('save');
		return serverSave(id, input);
	});
	mocked.uploadPhoto.mockImplementation(async () => void calls.push('upload'));
	mocked.removeRecipe.mockImplementation(async () => void calls.push('remove'));
	mocked.downloadPhoto.mockImplementation(async (id) => `data:${id}`);

	db.resetDB();
	await new Promise<void>((resolve) => {
		const request = indexedDB.deleteDatabase('receptenapp-db');
		request.onsuccess = request.onerror = request.onblocked = () => resolve();
	});
	recipes.set([]);
	error.set(null);
	localStorage.clear();
	setBookCode('KOEK4827TAART');
});

describe('addRecipe', () => {
	it('uploadt eerst de fotos, bewaart dan het recept en werkt daarna lokaal bij', async () => {
		const saved = await addRecipe({ ...soep, photos: ['data:a', 'data:b'] });

		expect(calls).toEqual(['upload', 'upload', 'save']);
		const [id, input] = mocked.saveRecipe.mock.calls[0];
		expect(id).toBe(saved.id);
		expect(input.photoIds).toHaveLength(2);
		expect(new Set(input.photoIds).size).toBe(2);
		expect(mocked.uploadPhoto.mock.calls.map((c) => [c[0], c[1], c[2]])).toEqual([
			[saved.id, input.photoIds[0], 'data:a'],
			[saved.id, input.photoIds[1], 'data:b']
		]);
		expect(input).not.toHaveProperty('photos');

		expect(saved.photos).toEqual(['data:a', 'data:b']);
		expect(saved.updatedAt).toBeInstanceOf(Date);
		expect(await db.getRecipe(saved.id)).toEqual(saved);
		expect(get(recipes)).toEqual([saved]);
	});

	it('wijzigt lokaal niets als de server niet bereikbaar is', async () => {
		mocked.saveRecipe.mockRejectedValue(new OfflineError());
		await expect(addRecipe(soep)).rejects.toBeInstanceOf(OfflineError);
		expect(await db.getAllRecipes()).toEqual([]);
		expect(get(recipes)).toEqual([]);
	});

	it('bewaart het recept niet als een foto wordt geweigerd', async () => {
		mocked.uploadPhoto.mockRejectedValue(new ApiError(413, 'photo_too_large'));
		await expect(addRecipe({ ...soep, photos: ['data:a'] })).rejects.toBeInstanceOf(ApiError);
		expect(mocked.saveRecipe).not.toHaveBeenCalled();
		expect(await db.getAllRecipes()).toEqual([]);
	});
});

describe('updateRecipe', () => {
	it('uploadt alleen nieuwe fotos en houdt het id van bestaande', async () => {
		const original = await addRecipe({ ...soep, photos: ['data:a'] });
		vi.clearAllMocks();

		await updateRecipe(original.id, { title: 'Snert', photos: ['data:a', 'data:nieuw'] });

		expect(mocked.uploadPhoto).toHaveBeenCalledTimes(1);
		expect(mocked.uploadPhoto.mock.calls[0][2]).toBe('data:nieuw');
		const input = mocked.saveRecipe.mock.calls[0][1];
		expect(input.photoIds[0]).toBe(original.photoIds[0]);
		expect(input.photoIds[1]).toBe(mocked.uploadPhoto.mock.calls[0][1]);
		expect(input.title).toBe('Snert');

		const local = await db.getRecipe(original.id);
		expect(local?.title).toBe('Snert');
		expect(local?.photos).toEqual(['data:a', 'data:nieuw']);
		expect(get(recipes)[0].title).toBe('Snert');
	});

	it('geeft twee keer dezelfde foto twee verschillende ids', async () => {
		const original = await addRecipe({ ...soep, photos: ['data:a'] });
		await updateRecipe(original.id, { photos: ['data:a', 'data:a'] });
		const input = mocked.saveRecipe.mock.calls.at(-1)![1];
		expect(new Set(input.photoIds).size).toBe(2);
	});

	it('wijzigt lokaal niets als bewaren mislukt', async () => {
		const original = await addRecipe(soep);
		mocked.saveRecipe.mockRejectedValue(new OfflineError());
		await expect(updateRecipe(original.id, { title: 'Snert' })).rejects.toBeInstanceOf(
			OfflineError
		);
		expect((await db.getRecipe(original.id))?.title).toBe('Erwtensoep');
		expect(get(recipes)[0].title).toBe('Erwtensoep');
	});
});

describe('toggleFavorite', () => {
	it('bewaart de omgekeerde favoriet zonder fotos te uploaden', async () => {
		const original = await addRecipe({ ...soep, photos: ['data:a'] });
		vi.clearAllMocks();

		await toggleFavorite(original.id);

		expect(mocked.uploadPhoto).not.toHaveBeenCalled();
		const input = mocked.saveRecipe.mock.calls[0][1];
		expect(input.isFavorite).toBe(true);
		expect(input.photoIds).toEqual(original.photoIds);
		expect((await db.getRecipe(original.id))?.isFavorite).toBe(true);
		expect(get(recipes)[0].isFavorite).toBe(true);
	});
});

describe('tryToggleFavorite', () => {
	it('toont de bewaar-melding als favoriet maken mislukt, zonder fout te gooien', async () => {
		const original = await addRecipe(soep);
		mocked.saveRecipe.mockRejectedValue(new OfflineError());
		notice.set(null);
		await tryToggleFavorite(original.id);
		expect(get(notice)).toBe(SAVE_FAILED);
		expect(get(recipes)[0].isFavorite).toBe(false);
	});

	it('toont geen melding als het lukt', async () => {
		const original = await addRecipe(soep);
		notice.set(null);
		await tryToggleFavorite(original.id);
		expect(get(notice)).toBeNull();
		expect(get(recipes)[0].isFavorite).toBe(true);
	});
});

describe('deleteRecipe', () => {
	it('verwijdert op de server en daarna lokaal', async () => {
		const original = await addRecipe(soep);
		await deleteRecipe(original.id);
		expect(mocked.removeRecipe).toHaveBeenCalledWith(original.id);
		expect(await db.getRecipe(original.id)).toBeNull();
		expect(get(recipes)).toEqual([]);
	});

	it('verwijdert lokaal niet als de server faalt', async () => {
		const original = await addRecipe(soep);
		mocked.removeRecipe.mockRejectedValue(new OfflineError());
		await expect(deleteRecipe(original.id)).rejects.toBeInstanceOf(OfflineError);
		expect(await db.getRecipe(original.id)).not.toBeNull();
		expect(get(recipes)).toHaveLength(1);
	});
});

describe('loadRecipes', () => {
	it('neemt de stand van de server over', async () => {
		mocked.listRecipes.mockResolvedValue([serverSave('r1', { ...soep, photoIds: [] } as never)]);
		await loadRecipes();
		expect(get(recipes).map((r) => r.id)).toEqual(['r1']);
		expect(get(isLoading)).toBe(false);
		expect(get(error)).toBeNull();
	});

	it('toont de lokale recepten zonder melding als er geen verbinding is', async () => {
		const original = await addRecipe(soep);
		recipes.set([]);
		mocked.listRecipes.mockRejectedValue(new OfflineError());
		await loadRecipes();
		expect(get(recipes).map((r) => r.id)).toEqual([original.id]);
		expect(get(error)).toBeNull();
		expect(get(isLoading)).toBe(false);
	});

	it('toont de lokale recepten met een melding als de server de code weigert', async () => {
		const original = await addRecipe(soep);
		recipes.set([]);
		mocked.listRecipes.mockRejectedValue(new ApiError(401, 'unknown_code'));
		await loadRecipes();
		expect(get(recipes).map((r) => r.id)).toEqual([original.id]);
		expect(await db.getAllRecipes()).toHaveLength(1);
		expect(get(error)).toBe('Ophalen is niet gelukt. Je ziet de recepten van de vorige keer.');
	});

	it('vraagt de server niets als het apparaat niet gekoppeld is', async () => {
		clearBookCode();
		await loadRecipes();
		expect(mocked.listRecipes).not.toHaveBeenCalled();
	});
});

describe('importRecipes', () => {
	const oldExport = JSON.stringify({
		version: 1,
		exportDate: '2025-06-01T00:00:00.000Z',
		recipes: [
			{
				id: '1700000000000-abc1234',
				title: 'Appeltaart',
				category: 'dessert',
				ingredients: ['appels'],
				photos: ['data:image/jpeg;base64,/9j/'],
				isFavorite: true,
				createdAt: '2024-03-04T05:06:07.000Z',
				updatedAt: '2024-03-05T05:06:07.000Z'
			},
			{ title: 'Thee', category: 'drank', photos: [], isFavorite: false }
		]
	});
	const file = (text: string) => new File([text], 'recepten.json', { type: 'application/json' });

	it('stuurt recepten uit een oud exportbestand met fotos naar de server', async () => {
		const count = await importRecipes(file(oldExport), 'merge');

		expect(count).toBe(2);
		expect(mocked.uploadPhoto).toHaveBeenCalledTimes(1);
		expect(mocked.uploadPhoto.mock.calls[0][2]).toBe('data:image/jpeg;base64,/9j/');
		expect(mocked.saveRecipe).toHaveBeenCalledTimes(2);
		const [id, input] = mocked.saveRecipe.mock.calls[0];
		expect(id).not.toBe('1700000000000-abc1234');
		expect(input.createdAt).toBe('2024-03-04T05:06:07.000Z');
		expect(input.isFavorite).toBe(true);
		expect(input.photoIds).toHaveLength(1);
		expect(mocked.removeRecipe).not.toHaveBeenCalled();
		expect(get(recipes)).toHaveLength(2);
		expect(await db.getAllRecipes()).toHaveLength(2);
	});

	it.each([
		['geen json', 'dit is geen json'],
		['geen receptenlijst', '{"foo":1}'],
		['recept zonder titel', '{"recipes":[{"category":"soep"}]}'],
		['lijst met iets anders', '{"recipes":["soep"]}']
	])('weigert een onleesbaar bestand (%s) zonder iets te wijzigen', async (_name, text) => {
		await addRecipe(soep);
		vi.clearAllMocks();
		await expect(importRecipes(file(text), 'replace')).rejects.toThrow(
			'Dit bestand kan niet worden gelezen.'
		);
		expect(mocked.removeRecipe).not.toHaveBeenCalled();
		expect(mocked.saveRecipe).not.toHaveBeenCalled();
		expect(await db.getAllRecipes()).toHaveLength(1);
	});

	it('vervangen leest eerst alles in en verwijdert pas daarna de oude recepten', async () => {
		const original = await addRecipe(soep);
		mocked.listRecipes.mockResolvedValue([serverSave(original.id, { ...soep, photoIds: [] } as never)]);
		calls.length = 0;

		await importRecipes(file(oldExport), 'replace');

		expect(mocked.removeRecipe).toHaveBeenCalledTimes(1);
		expect(mocked.removeRecipe).toHaveBeenCalledWith(original.id);
		expect(calls.at(-1)).toBe('remove');
		expect(calls.indexOf('remove')).toBeGreaterThan(calls.lastIndexOf('save'));
		expect(get(recipes).map((r) => r.title).sort()).toEqual(['Appeltaart', 'Thee']);
		expect((await db.getAllRecipes()).map((r) => r.title).sort()).toEqual(['Appeltaart', 'Thee']);
	});

	const recipeWith = (extra: Record<string, unknown>) =>
		JSON.stringify({
			recipes: [
				{ title: 'Soep', category: 'soep', photos: [] },
				{ title: 'Grote taart', category: 'dessert', photos: [], ...extra }
			]
		});
	const TOO_BIG = 'Het recept "Grote taart" in dit bestand is te groot of heeft te veel foto\'s. Er is niets ingelezen.';

	it.each([
		['21 fotos', { photos: Array.from({ length: 21 }, () => 'data:image/jpeg;base64,/9j/') }],
		['een kapotte foto', { photos: ['data:image/jpeg;base64,dit is geen base64!'] }],
		['een foto boven 1.500.000 bytes', { photos: ['data:image/jpeg;base64,' + 'A'.repeat(2_000_004)] }],
		['te veel tekst', { notes: 'x'.repeat(200_001) }]
	])('weigert een bestand met %s voordat er iets verandert', async (_name, extra) => {
		const original = await addRecipe(soep);
		mocked.listRecipes.mockResolvedValue([serverSave(original.id, { ...soep, photoIds: [] } as never)]);
		vi.clearAllMocks();

		await expect(importRecipes(file(recipeWith(extra)), 'replace')).rejects.toThrow(TOO_BIG);

		expect(mocked.saveRecipe).not.toHaveBeenCalled();
		expect(mocked.uploadPhoto).not.toHaveBeenCalled();
		expect(mocked.removeRecipe).not.toHaveBeenCalled();
		expect(await db.getAllRecipes()).toHaveLength(1);
	});

	it('laat bij een fout halverwege de oude recepten staan en meldt hoeveel er zijn ingelezen', async () => {
		const original = await addRecipe(soep);
		mocked.listRecipes.mockResolvedValue([serverSave(original.id, { ...soep, photoIds: [] } as never)]);
		mocked.saveRecipe
			.mockImplementationOnce(async (id, input) => serverSave(id, input))
			.mockRejectedValueOnce(new OfflineError());

		const error = await importRecipes(file(oldExport), 'replace').catch((e) => e);

		expect(error).toBeInstanceOf(ImportError);
		expect(error.message).toBe(
			'Er zijn 1 van de 2 recepten ingelezen. Daarna lukte het niet meer. Controleer de internetverbinding en probeer het opnieuw.'
		);
		expect(mocked.removeRecipe).not.toHaveBeenCalled();
		expect((await db.getAllRecipes()).map((r) => r.title).sort()).toEqual(['Appeltaart', 'Erwtensoep']);
	});

	it('wacht en probeert opnieuw als de server even te druk is (429)', async () => {
		mocked.saveRecipe.mockRejectedValueOnce(new ApiError(429, 'rate_limited'));
		const count = await importRecipes(file(oldExport), 'merge', { retryDelayMs: 0 });
		expect(count).toBe(2);
		expect(get(recipes)).toHaveLength(2);
	});
});

describe('deleteAllRecipes', () => {
	it('verwijdert alle recepten op de server en lokaal', async () => {
		const a = await addRecipe(soep);
		mocked.listRecipes.mockResolvedValue([serverSave(a.id, { ...soep, photoIds: [] } as never)]);
		await deleteAllRecipes();
		expect(mocked.removeRecipe).toHaveBeenCalledWith(a.id);
		expect(await db.getAllRecipes()).toEqual([]);
		expect(get(recipes)).toEqual([]);
	});
});

describe('SAVE_FAILED', () => {
	it('is de melding uit het ontwerp', () => {
		expect(SAVE_FAILED).toBe(
			'Bewaren is niet gelukt. Controleer de internetverbinding en probeer het opnieuw.'
		);
	});
});
