import { describe, it, expect } from 'vitest';
import { api, db, newBook } from './test-helpers';
import worker, { type Env } from './index';
import { isValidCodeShape, formatCode } from '../src/lib/api/code';

describe('receptenboek', () => {
	it('maakt een nieuw receptenboek met een code', async () => {
		const response = await api('/api/books', { method: 'POST' });
		expect(response.status).toBe(201);
		const body = (await response.json()) as { code: string };
		expect(isValidCodeShape(body.code)).toBe(true);
	});

	it('herkent een bestaande code', async () => {
		const code = await newBook();
		const response = await api('/api/book', { code });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});

	it('herkent de code ook met kleine letters, spaties en streepjes', async () => {
		const code = await newBook();
		const typed = ` ${formatCode(code).toLowerCase().replace(/-/g, ' ')} `;
		expect((await api('/api/book', { code: typed })).status).toBe(200);
		expect((await api('/api/book', { code: formatCode(code) })).status).toBe(200);
	});

	it('weigert een onbekende code', async () => {
		const response = await api('/api/book', { code: 'APPEL0000PEER' });
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'unknown_code' });
	});

	it('weigert een aanvraag zonder code', async () => {
		const response = await api('/api/book');
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'unknown_code' });
	});

	it('geeft 404 als JSON voor een onbekende route', async () => {
		const code = await newBook();
		const response = await api('/api/bestaatniet', { code });
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'not_found' });
	});

	it('bewaart de code niet leesbaar in de database', async () => {
		const code = await newBook();
		const { results } = await db.prepare('SELECT * FROM books').all();
		expect(results.length).toBeGreaterThan(0);
		expect(JSON.stringify(results)).not.toContain(code);
		expect(results.every((row) => /^[0-9a-f]{64}$/.test(String(row.code_hash)))).toBe(true);
	});
});

describe('begrenzing', () => {
	const blocked = { limit: async () => ({ success: false }) } as unknown as RateLimit;
	const env = (limiter?: RateLimit) => ({ DB: db, API_LIMITER: limiter }) as unknown as Env;

	it('geeft 429 als de afzender te veel aanvragen doet', async () => {
		const response = await worker.fetch(
			new Request('https://example.com/api/book', { headers: { 'X-Receptenboek-Code': 'APPEL0000PEER' } }),
			env(blocked)
		);
		expect(response.status).toBe(429);
		expect(await response.json()).toEqual({ error: 'rate_limited' });
	});

	it('werkt zonder begrenzing als de binding ontbreekt', async () => {
		const response = await worker.fetch(
			new Request('https://example.com/api/books', { method: 'POST' }),
			env()
		);
		expect(response.status).toBe(201);
	});
});
