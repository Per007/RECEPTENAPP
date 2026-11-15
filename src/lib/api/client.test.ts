import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	ApiError,
	OfflineError,
	checkCode,
	createBook,
	downloadPhoto,
	listRecipes,
	removeRecipe,
	saveRecipe,
	uploadPhoto
} from './client';
import { setBookCode, clearBookCode } from '$lib/stores/book';
import type { RecipeInput } from './types';

const fetchMock = vi.fn();

function reply(status: number, body?: unknown): Response {
	return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

function lastCall(): { url: string; init: RequestInit; headers: Headers } {
	const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
	return { url, init, headers: new Headers(init?.headers) };
}

const input: RecipeInput = { title: 'Soep', category: 'soep', photoIds: [], isFavorite: false };

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
	localStorage.clear();
	setBookCode('KOEK4827TAART');
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('api client', () => {
	it('stuurt de opgeslagen code mee bij het ophalen van recepten', async () => {
		fetchMock.mockResolvedValue(reply(200, { recipes: [] }));
		expect(await listRecipes()).toEqual([]);
		const { url, headers } = lastCall();
		expect(url).toBe('/api/recipes');
		expect(headers.get('X-Receptenboek-Code')).toBe('KOEK4827TAART');
	});

	it('maakt een nieuw receptenboek zonder code mee te sturen', async () => {
		clearBookCode();
		fetchMock.mockResolvedValue(reply(201, { code: 'APPEL1234PEER' }));
		expect(await createBook()).toBe('APPEL1234PEER');
		const { url, init, headers } = lastCall();
		expect(url).toBe('/api/books');
		expect(init.method).toBe('POST');
		expect(headers.has('X-Receptenboek-Code')).toBe(false);
	});

	it('geeft OfflineError als fetch faalt', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(listRecipes()).rejects.toBeInstanceOf(OfflineError);
	});

	it('geeft ApiError met status en code bij een fout van de server', async () => {
		fetchMock.mockResolvedValue(reply(401, { error: 'unknown_code' }));
		const error = await listRecipes().catch((e) => e);
		expect(error).toBeInstanceOf(ApiError);
		expect(error.status).toBe(401);
		expect(error.code).toBe('unknown_code');
	});

	it('geeft ApiError ook als de fout geen JSON is', async () => {
		fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));
		const error = await listRecipes().catch((e) => e);
		expect(error).toBeInstanceOf(ApiError);
		expect(error.status).toBe(502);
	});

	it('checkCode stuurt de gegeven code mee en geeft true bij 200', async () => {
		fetchMock.mockResolvedValue(reply(200, { ok: true }));
		expect(await checkCode('APPEL1234PEER')).toBe(true);
		const { url, headers } = lastCall();
		expect(url).toBe('/api/book');
		expect(headers.get('X-Receptenboek-Code')).toBe('APPEL1234PEER');
	});

	it('checkCode geeft false bij 401', async () => {
		fetchMock.mockResolvedValue(reply(401, { error: 'unknown_code' }));
		expect(await checkCode('APPEL1234PEER')).toBe(false);
	});

	it('checkCode geeft ApiError bij 429', async () => {
		fetchMock.mockResolvedValue(reply(429, { error: 'rate_limited' }));
		await expect(checkCode('APPEL1234PEER')).rejects.toBeInstanceOf(ApiError);
	});

	it('saveRecipe stuurt het recept als JSON en geeft het antwoord terug', async () => {
		const saved = { ...input, id: 'r1', createdAt: 'a', updatedAt: 'b' };
		fetchMock.mockResolvedValue(reply(200, saved));
		expect(await saveRecipe('r1', input)).toEqual(saved);
		const { url, init } = lastCall();
		expect(url).toBe('/api/recipes/r1');
		expect(init.method).toBe('PUT');
		expect(JSON.parse(init.body as string)).toEqual(input);
	});

	it('removeRecipe stuurt DELETE', async () => {
		fetchMock.mockResolvedValue(reply(204));
		await removeRecipe('r1');
		const { url, init } = lastCall();
		expect(url).toBe('/api/recipes/r1');
		expect(init.method).toBe('DELETE');
	});

	it('uploadPhoto stuurt de bytes van de data-URL als image/jpeg', async () => {
		fetchMock.mockResolvedValue(reply(204));
		await uploadPhoto('r1', 'p1', 'data:image/jpeg;base64,/9j/'); // bytes 255, 216, 255
		const { url, init } = lastCall();
		expect(url).toBe('/api/recipes/r1/photos/p1');
		expect(init.method).toBe('PUT');
		const blob = init.body as Blob;
		expect(blob.type).toBe('image/jpeg');
		expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([255, 216, 255]);
	});

	it('downloadPhoto geeft een data-URL met dezelfde bytes, zonder code', async () => {
		fetchMock.mockResolvedValue(new Response(new Uint8Array([255, 216, 255]), { status: 200 }));
		expect(await downloadPhoto('p1')).toBe('data:image/jpeg;base64,/9j/');
		const { url, headers } = lastCall();
		expect(url).toBe('/api/photos/p1');
		expect(headers.has('X-Receptenboek-Code')).toBe(false);
	});

	it('downloadPhoto werkt ook voor een grote foto', async () => {
		const bytes = new Uint8Array(300_000).map((_, i) => i % 251);
		fetchMock.mockResolvedValue(new Response(bytes, { status: 200 }));
		const dataUrl = await downloadPhoto('p1');
		const decoded = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0));
		expect(decoded).toEqual(bytes);
	});
});
