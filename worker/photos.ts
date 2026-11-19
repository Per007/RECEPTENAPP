import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_RECIPE } from '../src/lib/api/types';
import { fail } from './http';
import type { Env } from './index';

/** Standaard ruimte voor foto's per receptenboek: ruim duizend verkleinde foto's. */
const DEFAULT_MAX_BOOK_PHOTO_BYTES = 300_000_000;

/** Foto's die na een dag nog niet in een recept staan, worden opgeruimd. */
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

export async function uploadPhoto(
	request: Request,
	env: Env,
	bookId: string,
	recipeId: string,
	photoId: string
): Promise<Response> {
	if (Number(request.headers.get('Content-Length') ?? 0) > MAX_PHOTO_BYTES) {
		return fail(413, 'photo_too_large');
	}
	const bytes = await request.arrayBuffer();
	if (bytes.byteLength > MAX_PHOTO_BYTES) return fail(413, 'photo_too_large');
	if (bytes.byteLength === 0) return fail(400, 'invalid_photo');

	// Een foto die opnieuw wordt geüpload, telt niet mee: die vervangt zichzelf.
	const usage = await env.DB.prepare(
		`SELECT
			(SELECT COUNT(*) FROM photos WHERE book_id = ?1 AND recipe_id = ?2 AND id <> ?3) AS recipe_photos,
			(SELECT COALESCE(SUM(length(data)), 0) FROM photos WHERE book_id = ?1 AND id <> ?3) AS book_bytes`
	)
		.bind(bookId, recipeId, photoId)
		.first<{ recipe_photos: number; book_bytes: number }>();
	if ((usage?.recipe_photos ?? 0) >= MAX_PHOTOS_PER_RECIPE) return fail(400, 'too_many_photos');
	const maxBookBytes = Number(env.MAX_BOOK_PHOTO_BYTES ?? DEFAULT_MAX_BOOK_PHOTO_BYTES);
	if ((usage?.book_bytes ?? 0) + bytes.byteLength > maxBookBytes) return fail(413, 'book_full');

	// Een bestaand foto-id mag alleen door hetzelfde receptenboek worden overschreven.
	const result = await env.DB.prepare(
		`INSERT INTO photos (id, book_id, recipe_id, data, created_at) VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT (id) DO UPDATE SET data = excluded.data, recipe_id = excluded.recipe_id
		 WHERE photos.book_id = excluded.book_id`
	)
		.bind(photoId, bookId, recipeId, bytes, new Date().toISOString())
		.run();
	if (result.meta.changes === 0) return fail(404, 'not_found');

	return new Response(null, { status: 204 });
}

/** Geen code nodig: het foto-id is lang en willekeurig, en dus zelf de sleutel. */
export async function getPhoto(env: Env, photoId: string): Promise<Response> {
	const row = await env.DB.prepare('SELECT data FROM photos WHERE id = ?')
		.bind(photoId)
		.first<{ data: ArrayBuffer | number[] }>();
	if (!row) return fail(404, 'not_found');

	return new Response(new Uint8Array(row.data), {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'public, max-age=31536000, immutable',
			'X-Content-Type-Options': 'nosniff'
		}
	});
}

/**
 * Verwijdert foto's ouder dan een dag die in geen enkel recept staan, bijvoorbeeld
 * van een recept dat nooit bewaard kon worden. Geeft het aantal verwijderde foto's.
 */
export async function cleanupOrphanPhotos(env: Env, now = new Date()): Promise<number> {
	const cutoff = new Date(now.getTime() - ORPHAN_AGE_MS).toISOString();
	const result = await env.DB.prepare(
		`DELETE FROM photos
		 WHERE created_at < ?
		   AND NOT EXISTS (
		     SELECT 1 FROM recipes r, json_each(r.data, '$.photoIds') j
		     WHERE r.book_id = photos.book_id AND r.id = photos.recipe_id AND j.value = photos.id
		   )`
	)
		.bind(cutoff)
		.run();
	return result.meta.changes;
}
