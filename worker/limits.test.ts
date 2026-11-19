import { describe, it, expect } from 'vitest';
import worker, { type Env } from './index';
import { cleanupOrphanPhotos } from './photos';
import { api, db, newBook } from './test-helpers';

const jpeg = (size = 3) => new Uint8Array(size).fill(1);

function putPhoto(code: string, recipeId: string, photoId: string, bytes: Uint8Array) {
	return api(`/api/recipes/${recipeId}/photos/${photoId}`, {
		method: 'PUT',
		code,
		headers: { 'Content-Type': 'image/jpeg' },
		body: bytes
	});
}

function putRecipe(code: string, id: string, photoIds: string[]) {
	return api(`/api/recipes/${id}`, {
		method: 'PUT',
		code,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title: 'Soep', category: 'soep', photoIds, isFavorite: false })
	});
}

describe('grenzen aan foto-opslag', () => {
	it('weigert een 21e foto voor hetzelfde recept', async () => {
		const code = await newBook();
		for (let i = 0; i < 20; i++) {
			expect((await putPhoto(code, 'r1', `veel-${i}`, jpeg())).status).toBe(204);
		}
		const response = await putPhoto(code, 'r1', 'veel-20', jpeg());
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'too_many_photos' });
	});

	it('laat een bestaande foto van dat recept wel opnieuw uploaden', async () => {
		const code = await newBook();
		for (let i = 0; i < 20; i++) await putPhoto(code, 'r1', `her-${i}`, jpeg());
		expect((await putPhoto(code, 'r1', 'her-3', jpeg())).status).toBe(204);
	});

	it('weigert fotos als het receptenboek vol is', async () => {
		const env = { DB: db, MAX_BOOK_PHOTO_BYTES: '10' } as unknown as Env;
		const request = (path: string, init: RequestInit = {}) =>
			worker.fetch(new Request(`https://example.com${path}`, init), env);
		const { code } = (await (await request('/api/books', { method: 'POST' })).json()) as {
			code: string;
		};
		const upload = (id: string, size: number) =>
			request(`/api/recipes/r1/photos/${id}`, {
				method: 'PUT',
				headers: { 'X-Receptenboek-Code': code },
				body: jpeg(size)
			});

		expect((await upload('vol-1', 6)).status).toBe(204);
		const response = await upload('vol-2', 5);
		expect(response.status).toBe(413);
		expect(await response.json()).toEqual({ error: 'book_full' });
		expect((await upload('vol-1', 10)).status).toBe(204);
	});

	it('begrenst het aanmaken van receptenboeken apart', async () => {
		const blocked = { limit: async () => ({ success: false }) } as unknown as RateLimit;
		const env = { DB: db, BOOK_LIMITER: blocked } as unknown as Env;
		const response = await worker.fetch(
			new Request('https://example.com/api/books', { method: 'POST' }),
			env
		);
		expect(response.status).toBe(429);
		expect(await response.json()).toEqual({ error: 'rate_limited' });
	});
});

describe('opruimen van losse fotos', () => {
	const old = '2020-01-01T00:00:00.000Z';
	const age = (id: string) =>
		db.prepare('UPDATE photos SET created_at = ? WHERE id = ?').bind(old, id).run();
	const exists = async (id: string) => (await api(`/api/photos/${id}`)).status === 200;

	it('verwijdert oude fotos die niet in een recept staan, en laat de rest staan', async () => {
		const code = await newBook();
		await putPhoto(code, 'zonder-recept', 'wees-oud', jpeg());
		await putPhoto(code, 'zonder-recept', 'wees-nieuw', jpeg());
		await putPhoto(code, 'r1', 'in-recept', jpeg());
		await putRecipe(code, 'r1', ['in-recept']);
		await putPhoto(code, 'r1', 'los-bij-recept', jpeg());
		await Promise.all([age('wees-oud'), age('in-recept'), age('los-bij-recept')]);

		const removed = await cleanupOrphanPhotos({ DB: db } as unknown as Env);

		expect(removed).toBeGreaterThanOrEqual(2);
		expect(await exists('wees-oud')).toBe(false);
		expect(await exists('los-bij-recept')).toBe(false);
		expect(await exists('wees-nieuw')).toBe(true);
		expect(await exists('in-recept')).toBe(true);
	});

	it('draait als geplande taak', async () => {
		const code = await newBook();
		await putPhoto(code, 'zonder-recept', 'cron-wees', jpeg());
		await age('cron-wees');
		const waits: Promise<unknown>[] = [];
		const ctx = { waitUntil: (p: Promise<unknown>) => waits.push(p) } as unknown as ExecutionContext;
		await worker.scheduled({} as ScheduledController, { DB: db } as unknown as Env, ctx);
		await Promise.all(waits);
		expect(await exists('cron-wees')).toBe(false);
	});
});
