// Wat de app en de Worker over de lijn sturen.
import type { RecipeCategory } from '../db/types';

export const CODE_HEADER = 'X-Receptenboek-Code';

export const MAX_PHOTO_BYTES = 1_500_000;
export const MAX_PHOTOS_PER_RECIPE = 20;
export const MAX_RECIPE_BYTES = 200_000;

export interface ApiErrorBody {
	error: string;
}

export interface NewBookResponse {
	code: string;
}

/** Een recept zoals de server het bewaart: foto's als id's, datums als ISO-tekst. */
export interface RemoteRecipe {
	id: string;
	title: string;
	category: RecipeCategory;
	ingredients?: string[];
	instructions?: string;
	photoIds: string[];
	sourceUrl?: string;
	isFavorite: boolean;
	servings?: number;
	cookTime?: number;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

/** Wat de app stuurt bij bewaren. createdAt alleen bij importeren. */
export type RecipeInput = Omit<RemoteRecipe, 'id' | 'updatedAt' | 'createdAt'> & {
	createdAt?: string;
};

export interface RecipeListResponse {
	recipes: RemoteRecipe[];
}
