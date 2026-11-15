import { describe, it, expect } from 'vitest';
import { api, newBook } from './test-helpers';
import type { RecipeInput, RemoteRecipe } from '../src/lib/api/types';

const soep: RecipeInput = {
	title: 'Erwtensoep',
	category: 'soep',
	ingredients: ['500 g spliterwten', '1 rookworst'],
	instructions: 'Lang laten trekken.',
	photoIds: [],
	isFavorite: false,
	servings: 4,
	cookTime: 120,
	notes: 'Van oma'
};

function put(code: string, id: string, input: unknown) {
	return api(`/api/recipes/${id}`, {
		method: 'PUT',
		code,
		headers: { 'Content-Type': 'application/json' },
		body: typeof input === 'string' ? input : JSON.stringify(input)
	});
}

function putPhoto(code: string, recipeId: string, photoId: string, bytes: Uint8Array) {
	return api(`/api/recipes/${recipeId}/photos/${photoId}`, {
		method: 'PUT',
		code,
		headers: { 'Content-Type': 'image/jpeg' },
		body: bytes
	});
}

async function list(code: string): Promise<RemoteRecipe[]> {
	const response = await api('/api/recipes', { code });
	expect(response.status).toBe(200);
	return ((await response.json()) as { recipes: RemoteRecipe[] }).recipes;
}

describe('recepten', () => {
	it('bewaart een recept en geeft het terug in de lijst', async () => {
		const code = await newBook();
		const response = await put(code, 'r1', soep);
		expect(response.status).toBe(200);
		const saved = (await response.json()) as RemoteRecipe;
		expect(saved).toMatchObject({ ...soep, id: 'r1' });
		expect(new Date(saved.createdAt).toISOString()).toBe(saved.createdAt);
		expect(new Date(saved.updatedAt).toISOString()).toBe(saved.updatedAt);
		expect(await list(code)).toEqual([saved]);
	});

	it('vervangt een bestaand recept en houdt createdAt vast', async () => {
		const code = await newBook();
		const first = (await (await put(code, 'r1', soep)).json()) as RemoteRecipe;
		const second = (await (
			await put(code, 'r1', { ...soep, title: 'Snert', notes: undefined, isFavorite: true })
		).json()) as RemoteRecipe;
		expect(second.createdAt).toBe(first.createdAt);
		expect(second.updatedAt > first.updatedAt).toBe(true);
		expect(second.title).toBe('Snert');
		expect(second.isFavorite).toBe(true);
		expect(second.notes).toBeUndefined();
		expect(await list(code)).toEqual([second]);
	});

	it('neemt createdAt over bij een nieuw recept (importeren)', async () => {
		const code = await newBook();
		const saved = (await (
			await put(code, 'r1', { ...soep, createdAt: '2020-01-02T03:04:05.000Z' })
		).json()) as RemoteRecipe;
		expect(saved.createdAt).toBe('2020-01-02T03:04:05.000Z');
	});

	it('houdt receptenboeken gescheiden', async () => {
		const a = await newBook();
		const b = await newBook();
		await put(a, 'r1', soep);
		expect(await list(b)).toEqual([]);
		expect((await api('/api/recipes/r1', { method: 'DELETE', code: b })).status).toBe(204);
		expect((await list(a)).length).toBe(1);
	});

	it('verwijdert een recept, ook als het al weg is', async () => {
		const code = await newBook();
		await put(code, 'r1', soep);
		expect((await api('/api/recipes/r1', { method: 'DELETE', code })).status).toBe(204);
		expect(await list(code)).toEqual([]);
		expect((await api('/api/recipes/r1', { method: 'DELETE', code })).status).toBe(204);
	});

	it.each([
		['lege titel', { ...soep, title: '  ' }],
		['titel geen tekst', { ...soep, title: 5 }],
		['onbekende categorie', { ...soep, category: 'pizza' }],
		['photoIds geen lijst', { ...soep, photoIds: 'p1' }],
		['21 fotos', { ...soep, photoIds: Array.from({ length: 21 }, (_, i) => `p${i}`) }],
		['onbekende foto', { ...soep, photoIds: ['bestaatniet'] }],
		['ingredienten geen lijst', { ...soep, ingredients: 'zout' }],
		['geen json', 'dit is geen json'],
		['te groot', { ...soep, notes: 'x'.repeat(200_001) }]
	])('weigert een ongeldig recept: %s', async (_name, input) => {
		const code = await newBook();
		const response = await put(code, 'r1', input);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'invalid_recipe' });
		expect(await list(code)).toEqual([]);
	});

	it.each([
		['GET', '/api/recipes'],
		['PUT', '/api/recipes/r1'],
		['DELETE', '/api/recipes/r1'],
		['PUT', '/api/recipes/r1/photos/p1']
	])('weigert %s %s zonder geldige code', async (method, path) => {
		const response = await api(path, {
			method,
			code: 'APPEL0000PEER',
			body: method === 'PUT' ? '{}' : undefined
		});
		expect(response.status).toBe(401);
	});
});

describe('fotos', () => {
	const bytes = new Uint8Array([255, 216, 255]);

	it('bewaart een foto en geeft dezelfde bytes terug, zonder code', async () => {
		const code = await newBook();
		expect((await putPhoto(code, 'r1', 'p1', bytes)).status).toBe(204);
		const saved = (await (
			await put(code, 'r1', { ...soep, photoIds: ['p1'] })
		).json()) as RemoteRecipe;
		expect(saved.photoIds).toEqual(['p1']);

		const response = await api('/api/photos/p1');
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('image/jpeg');
		expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
	});

	it('verwijdert fotos die niet meer bij het recept horen', async () => {
		const code = await newBook();
		await putPhoto(code, 'r1', 'weg', bytes);
		await putPhoto(code, 'r1', 'blijft', bytes);
		await put(code, 'r1', { ...soep, photoIds: ['weg', 'blijft'] });
		await put(code, 'r1', { ...soep, photoIds: ['blijft'] });
		expect((await api('/api/photos/weg')).status).toBe(404);
		expect((await api('/api/photos/blijft')).status).toBe(200);
	});

	it('verwijdert de fotos samen met het recept', async () => {
		const code = await newBook();
		await putPhoto(code, 'r1', 'p-del', bytes);
		await put(code, 'r1', { ...soep, photoIds: ['p-del'] });
		await api('/api/recipes/r1', { method: 'DELETE', code });
		expect((await api('/api/photos/p-del')).status).toBe(404);
	});

	it('weigert een foto boven 1.500.000 bytes', async () => {
		const code = await newBook();
		const response = await putPhoto(code, 'r1', 'groot', new Uint8Array(1_500_001));
		expect(response.status).toBe(413);
		expect(await response.json()).toEqual({ error: 'photo_too_large' });
		expect((await api('/api/photos/groot')).status).toBe(404);
	});

	it('accepteert een foto van precies 1.500.000 bytes', async () => {
		const code = await newBook();
		expect((await putPhoto(code, 'r1', 'max', new Uint8Array(1_500_000))).status).toBe(204);
	});

	it('laat een ander receptenboek een foto niet overschrijven', async () => {
		const a = await newBook();
		const b = await newBook();
		await putPhoto(a, 'r1', 'van-a', bytes);
		expect((await putPhoto(b, 'r1', 'van-a', new Uint8Array([1, 2, 3]))).status).toBe(404);
		const response = await api('/api/photos/van-a');
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
	});

	it('weigert een foto van een ander recept in photoIds', async () => {
		const code = await newBook();
		await putPhoto(code, 'r2', 'van-r2', bytes);
		expect((await put(code, 'r1', { ...soep, photoIds: ['van-r2'] })).status).toBe(400);
	});

	it('geeft 404 voor een onbekende foto', async () => {
		expect((await api('/api/photos/onbekend')).status).toBe(404);
	});
});
