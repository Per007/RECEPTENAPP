import { describe, it, expect } from 'vitest';
import { api, newBook } from './test-helpers';
import type { RemoteRecipe } from '../src/lib/api/types';

const soep = { title: 'Soep', category: 'soep', photoIds: [] as string[], isFavorite: false };

function put(code: string, id: string, input: object) {
	return api(`/api/recipes/${id}`, {
		method: 'PUT',
		code,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
}

async function list(code: string): Promise<RemoteRecipe[]> {
	return ((await (await api('/api/recipes', { code })).json()) as { recipes: RemoteRecipe[] })
		.recipes;
}

describe('alles verwijderen', () => {
	it('verwijdert alle recepten en fotos van het eigen receptenboek in één keer', async () => {
		const a = await newBook();
		const b = await newBook();
		await api('/api/recipes/r1/photos/bulk-p1', {
			method: 'PUT',
			code: a,
			body: new Uint8Array([1, 2, 3])
		});
		await put(a, 'r1', { ...soep, photoIds: ['bulk-p1'] });
		for (let i = 2; i <= 150; i++) await put(a, `r${i}`, soep);
		await put(b, 'r1', soep);

		const response = await api('/api/recipes', { method: 'DELETE', code: a });

		expect(response.status).toBe(204);
		expect(await list(a)).toEqual([]);
		expect((await api('/api/photos/bulk-p1')).status).toBe(404);
		expect((await list(b)).length).toBe(1);
	});

	it('weigert zonder geldige code', async () => {
		expect((await api('/api/recipes', { method: 'DELETE', code: 'APPEL0000PEER' })).status).toBe(401);
	});
});

describe('favoriet', () => {
	it('verandert alleen de favoriet en laat de rest van het recept staan', async () => {
		const code = await newBook();
		const first = (await (await put(code, 'r1', soep)).json()) as RemoteRecipe;
		// Een ander apparaat wijzigt intussen de titel.
		await put(code, 'r1', { ...soep, title: 'Snert' });

		const response = await api('/api/recipes/r1/favorite', {
			method: 'PUT',
			code,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isFavorite: true })
		});

		expect(response.status).toBe(200);
		const saved = (await response.json()) as RemoteRecipe;
		expect(saved.title).toBe('Snert');
		expect(saved.isFavorite).toBe(true);
		expect(saved.updatedAt > first.updatedAt).toBe(true);
		expect(await list(code)).toEqual([saved]);
	});

	it('geeft 404 voor een recept dat niet (meer) bestaat', async () => {
		const code = await newBook();
		const response = await api('/api/recipes/weg/favorite', {
			method: 'PUT',
			code,
			body: JSON.stringify({ isFavorite: true })
		});
		expect(response.status).toBe(404);
	});

	it('weigert een ongeldige waarde', async () => {
		const code = await newBook();
		await put(code, 'r1', soep);
		const response = await api('/api/recipes/r1/favorite', {
			method: 'PUT',
			code,
			body: JSON.stringify({ isFavorite: 'ja' })
		});
		expect(response.status).toBe(400);
	});
});
