import { authenticate, createBook } from './books';
import { fail, json } from './http';
import { getPhoto, uploadPhoto } from './photos';
import { deleteRecipe, listRecipes, saveRecipe } from './recipes';

export interface Env {
	DB: D1Database;
	ASSETS: Fetcher;
	API_LIMITER?: RateLimit;
}

const ID = '[A-Za-z0-9_-]{1,64}';
const PHOTO = new RegExp(`^/api/photos/(${ID})$`);
const RECIPE = new RegExp(`^/api/recipes/(${ID})$`);
const RECIPE_PHOTO = new RegExp(`^/api/recipes/(${ID})/photos/(${ID})$`);

async function handleApi(request: Request, env: Env): Promise<Response> {
	const { pathname } = new URL(request.url);
	const method = request.method;
	let match: RegExpMatchArray | null;

	// Foto's ophalen telt niet mee voor de begrenzing en vraagt geen code.
	if (method === 'GET' && (match = pathname.match(PHOTO))) return getPhoto(env, match[1]);

	// Begrenzing vóór de code-controle, zodat codes raden niet onbeperkt kan.
	if (env.API_LIMITER) {
		const key = request.headers.get('CF-Connecting-IP') ?? 'unknown';
		const { success } = await env.API_LIMITER.limit({ key });
		if (!success) return fail(429, 'rate_limited');
	}

	if (pathname === '/api/books' && method === 'POST') return createBook(env);

	const bookId = await authenticate(request, env);
	if (!bookId) return fail(401, 'unknown_code');

	if (pathname === '/api/book' && method === 'GET') return json({ ok: true });
	if (pathname === '/api/recipes' && method === 'GET') return listRecipes(env, bookId);

	if ((match = pathname.match(RECIPE))) {
		if (method === 'PUT') return saveRecipe(request, env, bookId, match[1]);
		if (method === 'DELETE') return deleteRecipe(env, bookId, match[1]);
	}
	if (method === 'PUT' && (match = pathname.match(RECIPE_PHOTO))) {
		return uploadPhoto(request, env, bookId, match[1], match[2]);
	}

	return fail(404, 'not_found');
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(request.url);
		if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
		try {
			return await handleApi(request, env);
		} catch (error) {
			console.error(error);
			return fail(500, 'server_error');
		}
	}
} satisfies ExportedHandler<Env>;
