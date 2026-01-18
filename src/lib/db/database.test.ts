import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import {
    addRecipe,
    getAllRecipes,
    getRecipe,
    updateRecipe,
    deleteRecipe,
    searchRecipes,
    toggleFavorite,
    exportRecipes,
    importRecipes,
    resetDB
} from './database';
import type { Recipe } from './types';

describe('Database Operations', () => {
    // Helper to create a dummy recipe
    const createDummyRecipe = () => ({
        title: 'Test Recipe',
        ingredients: ['Ing 1', 'Ing 2'],
        instructions: 'Step 1',
        servings: 4,

        cookTime: 20,
        category: 'hoofdgerecht' as const,
        isFavorite: false,
        photos: []
    });

    // Clean up DB before all tests? 
    // Since fake-indexeddb is in memory, we might need to rely on it clearing or do manual clear.
    // Ideally we'd close and delete, but with the specific implementation in database.ts using a module-level variable `db`,
    // it might be cleaner to just rely on process isolation or ensure unique IDs.
    // However, vitest runs concurrently by default, but within a file it's sequential.
    // Let's rely on cleaning up or just checking relative state. 
    // Actually, `fake-indexeddb/auto` mocks the global. Using `beforeEach` to reset IDB or just delete the DB is safer.

    beforeEach(async () => {
        // Reset internal connection cache
        resetDB();

        // Delete the database to start fresh
        const req = indexedDB.deleteDatabase('receptenapp-db');
        return new Promise<void>((resolve) => {
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
        });
    });

    it('should add a recipe', async () => {
        const input = createDummyRecipe();
        const recipe = await addRecipe(input);

        expect(recipe.id).toBeDefined();
        expect(recipe.title).toBe(input.title);
        expect(recipe.createdAt).toBeInstanceOf(Date);
        expect(recipe.updatedAt).toBeInstanceOf(Date);
    });

    it('should get all recipes', async () => {
        const input1 = createDummyRecipe();
        const input2 = { ...createDummyRecipe(), title: 'Recipe 2' };

        await addRecipe(input1);
        await addRecipe(input2);

        const recipes = await getAllRecipes();
        // Note: previous tests might have added recipes if state persists.
        expect(recipes.length).toBeGreaterThanOrEqual(2);
        expect(recipes.find(r => r.title === 'Test Recipe')).toBeDefined();
        expect(recipes.find(r => r.title === 'Recipe 2')).toBeDefined();
    });

    it('should get a recipe by ID', async () => {
        const input = createDummyRecipe();
        const created = await addRecipe(input);

        const retrieved = await getRecipe(created.id);
        expect(retrieved).toEqual(created);
    });

    it('should update a recipe', async () => {
        const input = createDummyRecipe();
        const created = await addRecipe(input);

        const updated = await updateRecipe(created.id, { title: 'Updated Title' });
        expect(updated.title).toBe('Updated Title');
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());

        const retrieved = await getRecipe(created.id);
        expect(retrieved!.title).toBe('Updated Title');
    });

    it('should delete a recipe', async () => {
        const input = createDummyRecipe();
        const created = await addRecipe(input);

        await deleteRecipe(created.id);
        const retrieved = await getRecipe(created.id);
        expect(retrieved).toBeNull();
    });

    it('should search recipes', async () => {
        await addRecipe({ ...createDummyRecipe(), title: 'Spaghetti Bolognese' });
        await addRecipe({ ...createDummyRecipe(), title: 'Chicken Curry', ingredients: ['Chicken', 'Curry Paste'] });
        await addRecipe({ ...createDummyRecipe(), title: 'Salad' });

        const resultsTitle = await searchRecipes('Spaghetti');
        expect(resultsTitle.find(r => r.title === 'Spaghetti Bolognese')).toBeDefined();

        const resultsIng = await searchRecipes('Curry');
        expect(resultsIng.find(r => r.title === 'Chicken Curry')).toBeDefined();
    });

    it('should toggle favorite', async () => {
        const input = createDummyRecipe();
        const created = await addRecipe(input);
        expect(created.isFavorite).toBe(false);

        const toggled = await toggleFavorite(created.id);
        expect(toggled.isFavorite).toBe(true);

        const toggledBack = await toggleFavorite(created.id);
        expect(toggledBack.isFavorite).toBe(false);
    });
});
