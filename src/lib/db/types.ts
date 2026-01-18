// Recipe type definitions
export type RecipeCategory =
    | 'hoofdgerecht'
    | 'voorgerecht'
    | 'dessert'
    | 'bijgerecht'
    | 'snack'
    | 'drank'
    | 'soep'
    | 'salade'
    | 'ontbijt'
    | 'anders';

export interface Recipe {
    id: string;
    title: string;
    category: RecipeCategory;
    ingredients?: string[];
    instructions?: string;
    photos: string[];  // Base64 encoded images
    sourceUrl?: string;
    isFavorite: boolean;
    servings?: number;

    cookTime?: number;  // in minutes
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface RecipeFormData {
    title: string;
    category: RecipeCategory;
    ingredients?: string;  // Newline separated
    instructions?: string;
    photos: string[];
    sourceUrl?: string;
    servings?: number;

    cookTime?: number;
    notes?: string;
}

// Category metadata for display
export const CATEGORIES: { value: RecipeCategory; label: string; icon: string }[] = [
    { value: 'hoofdgerecht', label: 'Hoofdgerecht', icon: '🍽️' },
    { value: 'voorgerecht', label: 'Voorgerecht', icon: '🥗' },
    { value: 'dessert', label: 'Dessert', icon: '🍰' },
    { value: 'bijgerecht', label: 'Bijgerecht', icon: '🥔' },
    { value: 'snack', label: 'Snack', icon: '🍿' },
    { value: 'drank', label: 'Drank', icon: '🍹' },
    { value: 'soep', label: 'Soep', icon: '🍲' },
    { value: 'salade', label: 'Salade', icon: '🥬' },
    { value: 'ontbijt', label: 'Ontbijt', icon: '🍳' },
    { value: 'anders', label: 'Anders', icon: '📝' }
];

export function getCategoryLabel(category: RecipeCategory): string {
    return CATEGORIES.find(c => c.value === category)?.label || category;
}

export function getCategoryIcon(category: RecipeCategory): string {
    return CATEGORIES.find(c => c.value === category)?.icon || '📝';
}
