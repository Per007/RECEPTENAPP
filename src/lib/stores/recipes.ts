import { writable, derived, get } from 'svelte/store';
import { CATEGORIES, type Recipe, type RecipeCategory } from '$lib/db/types';
import * as db from '$lib/db/database';
import * as api from '$lib/api/client';
import { ApiError, OfflineError } from '$lib/api/client';
import {
    MAX_PHOTO_BYTES,
    MAX_PHOTOS_PER_RECIPE,
    MAX_RECIPE_BYTES,
    type RecipeInput
} from '$lib/api/types';
import { syncFromServer, toLocal } from '$lib/sync/sync';
import { getBookCode } from './book';

// Recepten staan op de server; IndexedDB is de lokale kopie om uit te lezen.
// Elke wijziging gaat eerst naar de server en pas na bevestiging naar de lokale kopie.

/** Wat een scherm aanlevert voor een nieuw recept; id's en datums komen van de server. */
export type NewRecipe = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'photoIds'>;

export const SAVE_FAILED =
    'Bewaren is niet gelukt. Controleer de internetverbinding en probeer het opnieuw.';
export const PHOTOS_TOO_MANY =
    "Bewaren is niet gelukt: te veel of te grote foto's. Een recept kan maximaal 20 foto's hebben.";
export const BOOK_FULL =
    "Bewaren is niet gelukt: het receptenboek is vol. Verwijder eerst foto's die je niet meer nodig hebt.";
export const CODE_UNKNOWN =
    'Bewaren is niet gelukt: dit receptenboek bestaat niet meer. Ontkoppel dit apparaat via Instellingen.';
export const RECIPE_GONE =
    'Dit recept bestaat niet meer. Het is waarschijnlijk op een ander apparaat verwijderd.';

/** Een melding die past bij wat er misging, in plaats van altijd "controleer de internetverbinding". */
export function saveErrorMessage(e: unknown): string {
    if (e instanceof ApiError) {
        if (e.code === 'too_many_photos' || e.code === 'photo_too_large') return PHOTOS_TOO_MANY;
        if (e.code === 'book_full') return BOOK_FULL;
        if (e.status === 401) return CODE_UNKNOWN;
        if (e.status === 404) return RECIPE_GONE;
    }
    return SAVE_FAILED;
}

const LOAD_FAILED = 'Ophalen is niet gelukt. Je ziet de recepten van de vorige keer.';
const UNREADABLE_FILE = 'Dit bestand kan niet worden gelezen.';

/** Fout bij importeren met een melding die de gebruiker zo kan lezen. */
export class ImportError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ImportError';
    }
}

// Main recipes store
export const recipes = writable<Recipe[]>([]);
export const isLoading = writable(true);
export const error = writable<string | null>(null);

// Filter state
export const searchQuery = writable('');
export const selectedCategory = writable<RecipeCategory | 'all'>('all');
export const showFavoritesOnly = writable(false);

// Derived store for filtered recipes
export const filteredRecipes = derived(
    [recipes, searchQuery, selectedCategory, showFavoritesOnly],
    ([$recipes, $searchQuery, $selectedCategory, $showFavoritesOnly]) => {
        let result = $recipes;

        // Filter by favorites
        if ($showFavoritesOnly) {
            result = result.filter(r => r.isFavorite);
        }

        // Filter by category
        if ($selectedCategory !== 'all') {
            result = result.filter(r => r.category === $selectedCategory);
        }

        // Filter by search query
        if ($searchQuery.trim()) {
            const query = $searchQuery.toLowerCase().trim();
            result = result.filter(r => {
                const titleMatch = r.title.toLowerCase().includes(query);
                const ingredientMatch = r.ingredients?.some(ing =>
                    ing.toLowerCase().includes(query)
                ) ?? false;
                return titleMatch || ingredientMatch;
            });
        }

        return result;
    }
);

// Derived store for favorites count
export const favoritesCount = derived(recipes, $recipes =>
    $recipes.filter(r => r.isFavorite).length
);

// Derived store for recipes count by category
export const categoryCount = derived(recipes, $recipes => {
    const counts: Record<string, number> = { all: $recipes.length };
    for (const recipe of $recipes) {
        counts[recipe.category] = (counts[recipe.category] || 0) + 1;
    }
    return counts;
});

let loading: Promise<void> | null = null;
let loadAgain = false;
/** Telt geslaagde wijzigingen, zodat ophalen weet of de server-stand intussen veranderd is. */
let writes = 0;

/**
 * Toont eerst de lokale kopie en haalt daarna de laatste stand van de server.
 * Zonder verbinding blijft de lokale kopie gewoon staan.
 * Wordt dit aangeroepen terwijl er al wordt opgehaald (bijvoorbeeld na overstappen naar
 * een ander receptenboek), dan wordt daarna nog een keer opgehaald.
 */
export function loadRecipes(): Promise<void> {
    if (loading) {
        loadAgain = true;
        return loading;
    }
    loading = (async () => {
        do {
            loadAgain = false;
            await doLoad();
        } while (loadAgain);
    })().finally(() => {
        loading = null;
    });
    return loading;
}

async function doLoad(): Promise<void> {
    error.set(null);

    try {
        recipes.set(await db.getAllRecipes());
    } catch (e) {
        error.set(e instanceof Error ? e.message : 'Fout bij het laden van recepten');
    } finally {
        isLoading.set(false);
    }

    if (!getBookCode()) return;

    try {
        // Is er tijdens het ophalen iets bewaard, dan is de opgehaalde stand al oud: opnieuw.
        for (let attempt = 0; attempt < 3; attempt++) {
            const before = writes;
            const result = await syncFromServer();
            if (writes === before) {
                recipes.set(result);
                break;
            }
        }
    } catch (e) {
        if (!(e instanceof OfflineError)) error.set(LOAD_FAILED);
    }
}

type ApiCall = <T>(fn: () => Promise<T>) => Promise<T>;
const direct: ApiCall = (fn) => fn();

/** Voor importeren: bij "te druk" (429) even wachten en dezelfde aanvraag herhalen. */
function retrying(delayMs: number, attempts = 6): ApiCall {
    return async (fn) => {
        for (let attempt = 1; ; attempt++) {
            try {
                return await fn();
            } catch (e) {
                const busy = e instanceof ApiError && e.status === 429;
                if (!busy || attempt >= attempts) throw e;
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
    };
}

function toInput(recipe: NewRecipe, photoIds: string[], createdAt?: Date): RecipeInput {
    return {
        title: recipe.title,
        category: recipe.category,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        sourceUrl: recipe.sourceUrl,
        isFavorite: recipe.isFavorite,
        servings: recipe.servings,
        cookTime: recipe.cookTime,
        notes: recipe.notes,
        photoIds,
        createdAt: createdAt?.toISOString()
    };
}

/**
 * Zorgt dat elke foto op de server staat en geeft de id's terug, in volgorde.
 * Een foto die het bestaande recept al had houdt zijn id; de rest wordt geüpload.
 */
async function ensurePhotos(
    recipeId: string,
    photos: string[],
    existing: Recipe | undefined,
    call: ApiCall
): Promise<string[]> {
    const used = new Set<string>();
    const photoIds: string[] = [];

    for (const photo of photos) {
        const index = existing ? existing.photos.indexOf(photo) : -1;
        let photoId = index >= 0 ? existing!.photoIds[index] : undefined;
        if (!photoId || used.has(photoId)) {
            photoId = crypto.randomUUID();
            const id = photoId;
            await call(() => api.uploadPhoto(recipeId, id, photo));
        }
        used.add(photoId);
        photoIds.push(photoId);
    }
    return photoIds;
}

async function createRecipe(data: NewRecipe, createdAt: Date | undefined, call: ApiCall): Promise<Recipe> {
    const id = crypto.randomUUID();
    const photoIds = await ensurePhotos(id, data.photos, undefined, call);
    const remote = await call(() => api.saveRecipe(id, toInput(data, photoIds, createdAt)));
    writes++;

    const saved = toLocal(remote, [...data.photos]);
    await db.putRecipe(saved);
    recipes.update(r => [saved, ...r]);
    return saved;
}

async function findRecipe(id: string): Promise<Recipe> {
    const recipe = get(recipes).find(r => r.id === id) ?? await db.getRecipe(id);
    if (!recipe) throw new Error('Recept niet gevonden');
    return recipe;
}

// Add a new recipe
export function addRecipe(recipeData: NewRecipe): Promise<Recipe> {
    return createRecipe(recipeData, undefined, direct);
}

// Update a recipe
export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<void> {
    const existing = await findRecipe(id);
    const merged: Recipe = { ...existing, ...updates, id };

    const photoIds = await ensurePhotos(id, merged.photos, existing, direct);
    const remote = await api.saveRecipe(id, toInput(merged, photoIds));
    writes++;

    const saved = toLocal(remote, [...merged.photos]);
    await db.putRecipe(saved);
    recipes.update(r => r.map(recipe => recipe.id === id ? saved : recipe));
}

// Delete a recipe
export async function deleteRecipe(id: string): Promise<void> {
    await api.removeRecipe(id);
    writes++;
    await db.deleteRecipe(id);
    recipes.update(r => r.filter(recipe => recipe.id !== id));
}

// Toggle favorite
export async function toggleFavorite(id: string): Promise<void> {
    const existing = await findRecipe(id);
    const remote = await api.setFavorite(id, !existing.isFavorite);
    writes++;

    // De server geeft het hele recept terug; foto's die hier al zijn, worden hergebruikt.
    const photos = remote.photoIds.map((photoId) => existing.photos[existing.photoIds.indexOf(photoId)]);
    if (photos.some((photo) => photo === undefined)) {
        await loadRecipes();
        return;
    }
    const saved = toLocal(remote, photos);
    await db.putRecipe(saved);
    recipes.update(r => r.map(recipe => recipe.id === id ? saved : recipe));
}

/** Korte melding voor de gebruiker; de layout toont hem bovenaan. */
export const notice = writable<string | null>(null);

/** Favoriet maken vanuit een lijst: bij een fout een melding in plaats van een exception. */
export async function tryToggleFavorite(id: string): Promise<void> {
    try {
        await toggleFavorite(id);
    } catch (e) {
        console.error(e);
        notice.set(saveErrorMessage(e));
    }
}

/** Verwijdert alle recepten uit het receptenboek, op alle gekoppelde apparaten. */
export async function deleteAllRecipes(): Promise<void> {
    await api.removeAllRecipes();
    writes++;
    await db.clearRecipes();
    recipes.set([]);
}

// Export recipes
export async function exportRecipes(): Promise<void> {
    const data = await db.exportRecipes();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recepten-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const CATEGORY_VALUES = new Set<string>(CATEGORIES.map(c => c.value));

const BASE64_PHOTO = /^data:[^;,]+;base64,([A-Za-z0-9+/]*={0,2})$/;

/** Zou de server dit recept aannemen? Zelfde grenzen als de Worker. */
function fitsServerLimits(recipe: NewRecipe, createdAt?: Date): boolean {
    if (recipe.photos.length > MAX_PHOTOS_PER_RECIPE) return false;
    for (const photo of recipe.photos) {
        const base64 = photo.match(BASE64_PHOTO)?.[1];
        if (base64 === undefined || base64.length % 4 !== 0) return false;
        const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
        if ((base64.length / 4) * 3 - padding > MAX_PHOTO_BYTES) return false;
    }
    const placeholderIds = recipe.photos.map(() => crypto.randomUUID());
    return JSON.stringify(toInput(recipe, placeholderIds, createdAt)).length <= MAX_RECIPE_BYTES;
}

/** Leest een exportbestand (ook uit de oude app). Gooit bij een bestand dat niet klopt. */
function parseImport(text: string): { recipe: NewRecipe; createdAt?: Date }[] {
    const items = parseImportShape(text);
    for (const { recipe, createdAt } of items) {
        if (!fitsServerLimits(recipe, createdAt)) {
            throw new ImportError(
                `Het recept "${recipe.title}" in dit bestand is te groot of heeft te veel foto's. Er is niets ingelezen.`
            );
        }
    }
    return items;
}

function parseImportShape(text: string): { recipe: NewRecipe; createdAt?: Date }[] {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        throw new ImportError(UNREADABLE_FILE);
    }
    const list = (data as { recipes?: unknown } | null)?.recipes;
    if (!Array.isArray(list)) throw new ImportError(UNREADABLE_FILE);

    const text_ = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
    const number_ = (value: unknown) => (typeof value === 'number' ? value : undefined);

    return list.map((item) => {
        if (typeof item !== 'object' || item === null) throw new ImportError(UNREADABLE_FILE);
        const r = item as Record<string, unknown>;
        if (typeof r.title !== 'string' || !r.title.trim()) throw new ImportError(UNREADABLE_FILE);

        const created = typeof r.createdAt === 'string' ? new Date(r.createdAt) : undefined;
        const recipe: NewRecipe = {
            title: r.title.trim(),
            category: (CATEGORY_VALUES.has(r.category as string) ? r.category : 'anders') as RecipeCategory,
            ingredients: Array.isArray(r.ingredients)
                ? r.ingredients.filter((i): i is string => typeof i === 'string')
                : undefined,
            instructions: text_(r.instructions),
            photos: Array.isArray(r.photos)
                ? r.photos.filter((p): p is string => typeof p === 'string' && p.startsWith('data:'))
                : [],
            sourceUrl: text_(r.sourceUrl),
            isFavorite: r.isFavorite === true,
            servings: number_(r.servings),
            cookTime: number_(r.cookTime),
            notes: text_(r.notes)
        };
        return { recipe, createdAt: created && !isNaN(created.getTime()) ? created : undefined };
    });
}

// Import recipes: het bestand gaat naar de server en verschijnt zo op alle apparaten
export async function importRecipes(
    file: File,
    mode: 'replace' | 'merge' = 'merge',
    options: { retryDelayMs?: number } = {}
): Promise<number> {
    // Eerst het hele bestand controleren; pas daarna iets wijzigen.
    const items = parseImport(await file.text());
    const call = retrying(options.retryDelayMs ?? 15000);

    // Bij vervangen: onthoud wat er nu staat, maar verwijder het pas als alles is ingelezen.
    const oldIds = mode === 'replace' ? (await call(() => api.listRecipes())).map(r => r.id) : [];

    let imported = 0;
    try {
        for (const { recipe, createdAt } of items) {
            await createRecipe(recipe, createdAt, call);
            imported++;
        }
    } catch (e) {
        console.error(e);
        throw new ImportError(
            `Er zijn ${imported} van de ${items.length} recepten ingelezen. Daarna lukte het niet meer. Controleer de internetverbinding en probeer het opnieuw.`
        );
    }

    for (const id of oldIds) {
        await call(() => api.removeRecipe(id));
        writes++;
        await db.deleteRecipe(id);
        recipes.update(r => r.filter(recipe => recipe.id !== id));
    }
    return items.length;
}

// Clear all filters
export function clearFilters(): void {
    searchQuery.set('');
    selectedCategory.set('all');
    showFavoritesOnly.set(false);
}
