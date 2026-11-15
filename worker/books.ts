import { isValidCodeShape, normalizeCode } from '../src/lib/api/code';
import { CODE_HEADER } from '../src/lib/api/types';
import { generateCode, hashCode } from './code';
import { fail, json } from './http';
import type { Env } from './index';

/** Geeft het book_id bij de meegestuurde code, of null als die niet bestaat. */
export async function authenticate(request: Request, env: Env): Promise<string | null> {
	const code = normalizeCode(request.headers.get(CODE_HEADER) ?? '');
	if (!isValidCodeShape(code)) return null;
	const row = await env.DB.prepare('SELECT id FROM books WHERE code_hash = ?')
		.bind(await hashCode(code))
		.first<{ id: string }>();
	return row?.id ?? null;
}

export async function createBook(env: Env): Promise<Response> {
	for (let attempt = 0; attempt < 5; attempt++) {
		const code = generateCode();
		const result = await env.DB.prepare(
			'INSERT INTO books (id, code_hash, created_at) VALUES (?, ?, ?) ON CONFLICT (code_hash) DO NOTHING'
		)
			.bind(crypto.randomUUID(), await hashCode(code), new Date().toISOString())
			.run();
		if (result.meta.changes === 1) return json({ code }, 201);
	}
	return fail(500, 'server_error');
}
