import { CATEGORIES, type RecipeCategory } from '../src/lib/db/types';
import {
	MAX_PHOTOS_PER_RECIPE,
	MAX_RECIPE_BYTES,
	type RemoteRecipe
} from '../src/lib/api/types';
import { fail, json } from './http';
import type { Env } from './index';

/** De velden die als JSON in de kolom `data` staan. */
type StoredFields = Omit<RemoteRecipe, 'id' | 'createdAt' | 'updatedAt'>;

interface RecipeRow {
	id: string;
	data: string;
	created_at: string;
	updated_at: string;
}

const CATEGORY_VALUES = new Set<string>(CATEGORIES.map((c) => c.value));

const isOptional = (value: unknown, type: 'string' | 'number'): boolean =>
	value === undefined || value === null || typeof value === type;

/** Controleert de body en houdt alleen bekende velden over. Null bij een ongeldig recept. */
function parseFields(body: unknown): { fields: StoredFields; createdAt?: string } | null {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
	const b = body as Record<string, unknown>;

	if (typeof b.title !== 'string' || b.title.trim() === '') return null;
	if (typeof b.category !== 'string' || !CATEGORY_VALUES.has(b.category)) return null;

	if (!Array.isArray(b.photoIds) || b.photoIds.length > MAX_PHOTOS_PER_RECIPE) return null;
	if (!b.photoIds.every((id) => typeof id === 'string')) return null;
	if (new Set(b.photoIds).size !== b.photoIds.length) return null;

	if (b.ingredients !== undefined && b.ingredients !== null) {
		if (!Array.isArray(b.ingredients) || !b.ingredients.every((i) => typeof i === 'string'))
			return null;
	}
	if (!isOptional(b.instructions, 'string')) return null;
	if (!isOptional(b.sourceUrl, 'string')) return null;
	if (!isOptional(b.notes, 'string')) return null;
	if (!isOptional(b.servings, 'number')) return null;
	if (!isOptional(b.cookTime, 'number')) return null;

	let createdAt: string | undefined;
	if (b.createdAt !== undefined && b.createdAt !== null) {
		const time = typeof b.createdAt === 'string' ? Date.parse(b.createdAt) : NaN;
		if (Number.isNaN(time)) return null;
		createdAt = new Date(time).toISOString();
	}

	const fields: StoredFields = {
		title: b.title.trim(),
		category: b.category as RecipeCategory,
		photoIds: b.photoIds as string[],
		isFavorite: b.isFavorite === true
	};
	if (Array.isArray(b.ingredients)) fields.ingredients = b.ingredients as string[];
	if (typeof b.instructions === 'string') fields.instructions = b.instructions;
	if (typeof b.sourceUrl === 'string') fields.sourceUrl = b.sourceUrl;
	if (typeof b.notes === 'string') fields.notes = b.notes;
	if (typeof b.servings === 'number') fields.servings = b.servings;
	if (typeof b.cookTime === 'number') fields.cookTime = b.cookTime;

	return { fields, createdAt };
}

function toRemote(row: RecipeRow): RemoteRecipe {
	return {
		...(JSON.parse(row.data) as StoredFields),
		id: row.id,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

export async function listRecipes(env: Env, bookId: string): Promise<Response> {
	const { results } = await env.DB.prepare(
		'SELECT id, data, created_at, updated_at FROM recipes WHERE book_id = ? ORDER BY created_at DESC'
	)
		.bind(bookId)
		.all<RecipeRow>();
	return json({ recipes: results.map(toRemote) });
}

export async function saveRecipe(
	request: Request,
	env: Env,
	bookId: string,
	recipeId: string
): Promise<Response> {
	const text = await request.text();
	if (text.length > MAX_RECIPE_BYTES) return fail(400, 'invalid_recipe');

	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		return fail(400, 'invalid_recipe');
	}
	const parsed = parseFields(body);
	if (!parsed) return fail(400, 'invalid_recipe');
	const { fields } = parsed;

	// Elke foto moet al voor dit recept in dit boek zijn geüpload.
	const [uploaded, existing] = await env.DB.batch<{ id: string } & RecipeRow>([
		env.DB.prepare('SELECT id FROM photos WHERE book_id = ? AND recipe_id = ?').bind(
			bookId,
			recipeId
		),
		env.DB.prepare(
			'SELECT id, data, created_at, updated_at FROM recipes WHERE book_id = ? AND id = ?'
		).bind(bookId, recipeId)
	]);
	const uploadedIds = new Set(uploaded.results.map((row) => row.id));
	if (!fields.photoIds.every((id) => uploadedIds.has(id))) return fail(400, 'invalid_recipe');

	const previous = existing.results[0] as RecipeRow | undefined;
	const updatedAt = nextUpdatedAt(previous?.updated_at);
	const createdAt = previous?.created_at ?? parsed.createdAt ?? updatedAt;

	const placeholders = fields.photoIds.map(() => '?').join(', ');
	const dropUnused = fields.photoIds.length
		? env.DB.prepare(
				`DELETE FROM photos WHERE book_id = ? AND recipe_id = ? AND id NOT IN (${placeholders})`
			).bind(bookId, recipeId, ...fields.photoIds)
		: env.DB.prepare('DELETE FROM photos WHERE book_id = ? AND recipe_id = ?').bind(
				bookId,
				recipeId
			);

	const data = JSON.stringify(fields);
	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO recipes (id, book_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT (book_id, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
		).bind(recipeId, bookId, data, createdAt, updatedAt),
		dropUnused
	]);

	return json(toRemote({ id: recipeId, data, created_at: createdAt, updated_at: updatedAt }));
}

/** updatedAt moet bij elke wijziging veranderen; daar vergelijken de apparaten op. */
function nextUpdatedAt(previous?: string): string {
	const now = new Date().toISOString();
	return previous && now <= previous ? new Date(Date.parse(previous) + 1).toISOString() : now;
}

/** Alleen de favoriet wijzigen, zodat een oude kopie op een apparaat niets anders terugzet. */
export async function setFavorite(
	request: Request,
	env: Env,
	bookId: string,
	recipeId: string
): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return fail(400, 'invalid_recipe');
	}
	const isFavorite = (body as { isFavorite?: unknown } | null)?.isFavorite;
	if (typeof isFavorite !== 'boolean') return fail(400, 'invalid_recipe');

	const row = await env.DB.prepare(
		'SELECT id, data, created_at, updated_at FROM recipes WHERE book_id = ? AND id = ?'
	)
		.bind(bookId, recipeId)
		.first<RecipeRow>();
	if (!row) return fail(404, 'not_found');

	const data = JSON.stringify({ ...(JSON.parse(row.data) as StoredFields), isFavorite });
	const updatedAt = nextUpdatedAt(row.updated_at);
	await env.DB.prepare('UPDATE recipes SET data = ?, updated_at = ? WHERE book_id = ? AND id = ?')
		.bind(data, updatedAt, bookId, recipeId)
		.run();
	return json(toRemote({ ...row, data, updated_at: updatedAt }));
}

export async function deleteAllRecipes(env: Env, bookId: string): Promise<Response> {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM recipes WHERE book_id = ?').bind(bookId),
		env.DB.prepare('DELETE FROM photos WHERE book_id = ?').bind(bookId)
	]);
	return new Response(null, { status: 204 });
}

export async function deleteRecipe(env: Env, bookId: string, recipeId: string): Promise<Response> {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM recipes WHERE book_id = ? AND id = ?').bind(bookId, recipeId),
		env.DB.prepare('DELETE FROM photos WHERE book_id = ? AND recipe_id = ?').bind(bookId, recipeId)
	]);
	return new Response(null, { status: 204 });
}
