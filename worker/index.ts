import { authenticate, createBook } from './books';
import { fail, json } from './http';

export interface Env {
	DB: D1Database;
	ASSETS: Fetcher;
	API_LIMITER?: RateLimit;
}

async function handleApi(request: Request, env: Env): Promise<Response> {
	const { pathname } = new URL(request.url);
	const method = request.method;

	if (env.API_LIMITER) {
		const key = request.headers.get('CF-Connecting-IP') ?? 'unknown';
		const { success } = await env.API_LIMITER.limit({ key });
		if (!success) return fail(429, 'rate_limited');
	}

	if (pathname === '/api/books' && method === 'POST') return createBook(env);

	const bookId = await authenticate(request, env);
	if (!bookId) return fail(401, 'unknown_code');

	if (pathname === '/api/book' && method === 'GET') return json({ ok: true });

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
