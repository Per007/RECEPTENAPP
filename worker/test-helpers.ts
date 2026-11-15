import { env, exports } from 'cloudflare:workers';

export const db = (env as unknown as { DB: D1Database }).DB;

const worker = (exports as unknown as { default: { fetch(request: Request): Promise<Response> } })
	.default;

export function api(
	path: string,
	init: RequestInit & { code?: string } = {}
): Promise<Response> {
	const headers = new Headers(init.headers);
	// Elk verzoek een eigen afzender, zodat de begrenzing de tests niet raakt.
	headers.set('CF-Connecting-IP', crypto.randomUUID());
	if (init.code !== undefined) headers.set('X-Receptenboek-Code', init.code);
	return worker.fetch(new Request(`https://example.com${path}`, { ...init, headers }));
}

export async function newBook(): Promise<string> {
	const response = await api('/api/books', { method: 'POST' });
	const body = (await response.json()) as { code: string };
	return body.code;
}
