import { getBookCode } from '$lib/stores/book';
import {
	CODE_HEADER,
	type NewBookResponse,
	type RecipeInput,
	type RecipeListResponse,
	type RemoteRecipe
} from './types';

/** Na zoveel tijd zonder antwoord geldt de server als niet bereikbaar. Foto's kunnen groot zijn. */
const REQUEST_TIMEOUT_MS = 30_000;

/** De server is niet bereikbaar (geen internet, of wifi zonder verbinding). */
export class OfflineError extends Error {
	constructor() {
		super('Geen verbinding met de server');
		this.name = 'OfflineError';
	}
}

/** De server gaf een foutantwoord. */
export class ApiError extends Error {
	constructor(
		public status: number,
		public code: string
	) {
		super(`Serverfout ${status}: ${code}`);
		this.name = 'ApiError';
	}
}

interface RequestOptions {
	method?: string;
	body?: BodyInit;
	contentType?: string;
	/** De code die meegaat; null stuurt geen code mee. Standaard de opgeslagen code. */
	code?: string | null;
}

async function request(path: string, options: RequestOptions = {}): Promise<Response> {
	const headers: Record<string, string> = {};
	const code = options.code === undefined ? getBookCode() : options.code;
	if (code) headers[CODE_HEADER] = code;
	if (options.contentType) headers['Content-Type'] = options.contentType;

	let response: Response;
	try {
		response = await fetch(path, {
			method: options.method ?? 'GET',
			headers,
			body: options.body,
			// Wifi zonder verbinding kan een aanvraag eindeloos laten hangen.
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});
	} catch {
		throw new OfflineError();
	}

	if (!response.ok) {
		let errorCode = 'unknown';
		try {
			const body = (await response.json()) as { error?: unknown };
			if (typeof body.error === 'string') errorCode = body.error;
		} catch {
			// Geen JSON, bijvoorbeeld een foutpagina van het netwerk.
		}
		throw new ApiError(response.status, errorCode);
	}
	return response;
}

export async function createBook(): Promise<string> {
	const response = await request('/api/books', { method: 'POST', code: null });
	return ((await response.json()) as NewBookResponse).code;
}

/** Bestaat deze code? Andere fouten dan "onbekend" worden doorgegooid. */
export async function checkCode(code: string): Promise<boolean> {
	try {
		await request('/api/book', { code });
		return true;
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) return false;
		throw error;
	}
}

export async function listRecipes(): Promise<RemoteRecipe[]> {
	const response = await request('/api/recipes');
	return ((await response.json()) as RecipeListResponse).recipes;
}

export async function saveRecipe(id: string, input: RecipeInput): Promise<RemoteRecipe> {
	const response = await request(`/api/recipes/${id}`, {
		method: 'PUT',
		body: JSON.stringify(input),
		contentType: 'application/json'
	});
	return (await response.json()) as RemoteRecipe;
}

/** Alle recepten van het receptenboek in één keer verwijderen. */
export async function removeAllRecipes(): Promise<void> {
	await request('/api/recipes', { method: 'DELETE' });
}

/** Alleen de favoriet wijzigen; de rest van het recept blijft zoals het op de server staat. */
export async function setFavorite(id: string, isFavorite: boolean): Promise<RemoteRecipe> {
	const response = await request(`/api/recipes/${id}/favorite`, {
		method: 'PUT',
		body: JSON.stringify({ isFavorite }),
		contentType: 'application/json'
	});
	return (await response.json()) as RemoteRecipe;
}

export async function removeRecipe(id: string): Promise<void> {
	await request(`/api/recipes/${id}`, { method: 'DELETE' });
}

function dataUrlToBlob(dataUrl: string): Blob {
	const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new Blob([bytes], { type: 'image/jpeg' });
}

function bytesToDataUrl(bytes: Uint8Array): string {
	let binary = '';
	const chunk = 0x8000; // in stukken, anders loopt de aanroep vast op grote foto's
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return `data:image/jpeg;base64,${btoa(binary)}`;
}

export async function uploadPhoto(
	recipeId: string,
	photoId: string,
	dataUrl: string
): Promise<void> {
	await request(`/api/recipes/${recipeId}/photos/${photoId}`, {
		method: 'PUT',
		body: dataUrlToBlob(dataUrl)
	});
}

export async function downloadPhoto(photoId: string): Promise<string> {
	const response = await request(`/api/photos/${photoId}`, { code: null });
	return bytesToDataUrl(new Uint8Array(await response.arrayBuffer()));
}
