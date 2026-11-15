import { MAX_PHOTO_BYTES } from '../src/lib/api/types';
import { fail } from './http';
import type { Env } from './index';

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

	// Een bestaand foto-id mag alleen door hetzelfde receptenboek worden overschreven.
	const result = await env.DB.prepare(
		`INSERT INTO photos (id, book_id, recipe_id, data) VALUES (?, ?, ?, ?)
		 ON CONFLICT (id) DO UPDATE SET data = excluded.data, recipe_id = excluded.recipe_id
		 WHERE photos.book_id = excluded.book_id`
	)
		.bind(photoId, bookId, recipeId, bytes)
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
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
}
