import type { Recipe, RecipeCategory } from './types';

const DB_NAME = 'receptenapp-db';
const DB_VERSION = 1;
const STORE_NAME = 'recipes';

let db: IDBDatabase | null = null;

// Initialize the database
export async function initDB(): Promise<IDBDatabase> {
    if (db) return db;

    // Request persistent storage if available
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        try {
            const isPersisted = await navigator.storage.persist();
            console.log(`Storage persisted: ${isPersisted}`);
        } catch (error) {
            console.warn('Failed to request persistent storage:', error);
        }
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Failed to open database'));
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            // Create recipes store
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });

                // Create indexes for searching/filtering
                store.createIndex('title', 'title', { unique: false });
                store.createIndex('category', 'category', { unique: false });
                store.createIndex('isFavorite', 'isFavorite', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };
    });
}

// Generate unique ID
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Add a new recipe
export async function addRecipe(recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
    const database = await initDB();

    const recipe: Recipe = {
        ...recipeData,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(recipe);

        request.onsuccess = () => resolve(recipe);
        request.onerror = () => reject(new Error('Failed to add recipe'));
    });
}

// Get all recipes
export async function getAllRecipes(): Promise<Recipe[]> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const recipes = request.result.map((r: Recipe) => ({
                ...r,
                createdAt: new Date(r.createdAt),
                updatedAt: new Date(r.updatedAt)
            }));
            // Sort by most recent first
            recipes.sort((a: Recipe, b: Recipe) => b.updatedAt.getTime() - a.updatedAt.getTime());
            resolve(recipes);
        };
        request.onerror = () => reject(new Error('Failed to get recipes'));
    });
}

// Get a single recipe by ID
export async function getRecipe(id: string): Promise<Recipe | null> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            if (request.result) {
                resolve({
                    ...request.result,
                    createdAt: new Date(request.result.createdAt),
                    updatedAt: new Date(request.result.updatedAt)
                });
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(new Error('Failed to get recipe'));
    });
}

// Update a recipe
export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    const database = await initDB();
    const existing = await getRecipe(id);

    if (!existing) {
        throw new Error('Recipe not found');
    }

    const updated: Recipe = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(updated);

        request.onsuccess = () => resolve(updated);
        request.onerror = () => reject(new Error('Failed to update recipe'));
    });
}

// Delete a recipe
export async function deleteRecipe(id: string): Promise<void> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to delete recipe'));
    });
}

// Toggle favorite status
export async function toggleFavorite(id: string): Promise<Recipe> {
    const recipe = await getRecipe(id);
    if (!recipe) throw new Error('Recipe not found');

    return updateRecipe(id, { isFavorite: !recipe.isFavorite });
}

// Get recipes by category
export async function getRecipesByCategory(category: RecipeCategory): Promise<Recipe[]> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('category');
        const request = index.getAll(category);

        request.onsuccess = () => {
            const recipes = request.result.map((r: Recipe) => ({
                ...r,
                createdAt: new Date(r.createdAt),
                updatedAt: new Date(r.updatedAt)
            }));
            recipes.sort((a: Recipe, b: Recipe) => b.updatedAt.getTime() - a.updatedAt.getTime());
            resolve(recipes);
        };
        request.onerror = () => reject(new Error('Failed to get recipes by category'));
    });
}

// Get favorite recipes
export async function getFavoriteRecipes(): Promise<Recipe[]> {
    const all = await getAllRecipes();
    return all.filter(r => r.isFavorite);
}

// Search recipes by title or ingredients
export async function searchRecipes(query: string): Promise<Recipe[]> {
    const all = await getAllRecipes();
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) return all;

    return all.filter(recipe => {
        const titleMatch = recipe.title.toLowerCase().includes(lowerQuery);
        const ingredientMatch = recipe.ingredients?.some(ing =>
            ing.toLowerCase().includes(lowerQuery)
        ) ?? false;
        return titleMatch || ingredientMatch;
    });
}

// Export all recipes as JSON
export async function exportRecipes(): Promise<string> {
    const recipes = await getAllRecipes();
    return JSON.stringify({
        version: 1,
        exportDate: new Date().toISOString(),
        recipes
    }, null, 2);
}

// Import recipes from JSON
export async function importRecipes(jsonString: string, mergeMode: 'replace' | 'merge' = 'merge'): Promise<number> {
    try {
        const data = JSON.parse(jsonString);

        if (!data.recipes || !Array.isArray(data.recipes)) {
            throw new Error('Invalid import format');
        }

        const database = await initDB();

        if (mergeMode === 'replace') {
            // Clear existing recipes
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(new Error('Failed to clear recipes'));
            });
        }

        let importedCount = 0;

        for (const recipe of data.recipes) {
            // Generate new ID for imported recipes in merge mode
            const newRecipe: Recipe = {
                ...recipe,
                id: mergeMode === 'merge' ? generateId() : recipe.id,
                createdAt: new Date(recipe.createdAt),
                updatedAt: new Date()
            };

            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(newRecipe);
                request.onsuccess = () => {
                    importedCount++;
                    resolve();
                };
                request.onerror = () => reject(new Error('Failed to import recipe'));
            });
        }

        return importedCount;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Invalid JSON format');
        }
        throw error;
    }
}

// Get total recipe count
export async function getRecipeCount(): Promise<number> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Failed to count recipes'));
    });
}

// Reset database connection (for testing)
export function resetDB() {
    if (db) {
        db.close();
        db = null;
    }
}
