import { writable, derived } from 'svelte/store';
import type { Recipe, RecipeCategory } from '$lib/db/types';
import * as db from '$lib/db/database';

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

// Load all recipes from database
export async function loadRecipes(): Promise<void> {
    isLoading.set(true);
    error.set(null);

    try {
        const allRecipes = await db.getAllRecipes();
        recipes.set(allRecipes);
    } catch (e) {
        error.set(e instanceof Error ? e.message : 'Fout bij het laden van recepten');
    } finally {
        isLoading.set(false);
    }
}

// Add a new recipe
export async function addRecipe(recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
    const newRecipe = await db.addRecipe(recipeData);
    recipes.update(r => [newRecipe, ...r]);
    return newRecipe;
}

// Update a recipe
export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<void> {
    const updated = await db.updateRecipe(id, updates);
    recipes.update(r => r.map(recipe => recipe.id === id ? updated : recipe));
}

// Delete a recipe
export async function deleteRecipe(id: string): Promise<void> {
    await db.deleteRecipe(id);
    recipes.update(r => r.filter(recipe => recipe.id !== id));
}

// Toggle favorite
export async function toggleFavorite(id: string): Promise<void> {
    const updated = await db.toggleFavorite(id);
    recipes.update(r => r.map(recipe => recipe.id === id ? updated : recipe));
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

// Import recipes
export async function importRecipes(file: File, mode: 'replace' | 'merge' = 'merge'): Promise<number> {
    const text = await file.text();
    const count = await db.importRecipes(text, mode);
    await loadRecipes();
    return count;
}

// Clear all filters
export function clearFilters(): void {
    searchQuery.set('');
    selectedCategory.set('all');
    showFavoritesOnly.set(false);
}
