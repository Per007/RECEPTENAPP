// Trekt de lokale kopie (IndexedDB) gelijk met wat de server heeft.
// De server is de waarheid: hier wordt nooit iets naar de server geschreven.
import * as api from '$lib/api/client';
import type { RemoteRecipe } from '$lib/api/types';
import * as db from '$lib/db/database';
import type { Recipe } from '$lib/db/types';

export interface SyncDeps {
	listRemote(): Promise<RemoteRecipe[]>;
	downloadPhoto(id: string): Promise<string>;
	getAllLocal(): Promise<Recipe[]>;
	putLocal(recipe: Recipe): Promise<void>;
	deleteLocal(id: string): Promise<void>;
}

const defaultDeps: SyncDeps = {
	listRemote: api.listRecipes,
	downloadPhoto: api.downloadPhoto,
	getAllLocal: db.getAllRecipes,
	putLocal: db.putRecipe,
	deleteLocal: db.deleteRecipe
};

/** Server-recept naar de vorm die de schermen gebruiken. `photos` loopt gelijk met photoIds. */
export function toLocal(remote: RemoteRecipe, photos: string[]): Recipe {
	const { createdAt, updatedAt, ...fields } = remote;
	return {
		...fields,
		photos,
		createdAt: new Date(createdAt),
		updatedAt: new Date(updatedAt)
	};
}

/**
 * Haalt de stand van de server op en werkt de lokale kopie bij.
 * Lukt het ophalen van de lijst niet, dan gaat de fout door en blijft lokaal alles zoals het was.
 */
export async function syncFromServer(deps: SyncDeps = defaultDeps): Promise<Recipe[]> {
	const remoteRecipes = await deps.listRemote();
	const local = new Map((await deps.getAllLocal()).map((r) => [r.id, r]));
	const result: Recipe[] = [];

	for (const remote of remoteRecipes) {
		const existing = local.get(remote.id);
		local.delete(remote.id);

		if (existing && existing.updatedAt.toISOString() === remote.updatedAt) {
			result.push(existing);
			continue;
		}

		try {
			const photos: string[] = [];
			for (const photoId of remote.photoIds) {
				const known = existing ? existing.photoIds.indexOf(photoId) : -1;
				photos.push(known >= 0 ? existing!.photos[known] : await deps.downloadPhoto(photoId));
			}
			const updated = toLocal(remote, photos);
			await deps.putLocal(updated);
			result.push(updated);
		} catch {
			// Dit ene recept lukt nu niet; de volgende keer opnieuw. De rest gaat door.
			if (existing) result.push(existing);
		}
	}

	// Wat overblijft staat niet meer op de server.
	for (const id of local.keys()) await deps.deleteLocal(id);

	return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
