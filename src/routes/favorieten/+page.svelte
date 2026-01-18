<script lang="ts">
  import { base } from '$app/paths';
  import { 
    recipes, 
    isLoading, 
    favoritesCount,
    toggleFavorite 
  } from '$lib/stores/recipes';
  import RecipeCard from '$lib/components/RecipeCard.svelte';
  import Button from '$lib/components/Button.svelte';

  let favoriteRecipes = $derived($recipes.filter(r => r.isFavorite));
</script>

<svelte:head>
  <title>Favorieten - Mijn Recepten</title>
  <meta name="description" content="Uw favoriete recepten op één plek">
</svelte:head>

<div class="page container">
  <header class="page-header">
    <h1>⭐ Favorieten</h1>
    <p class="subtitle">{$favoritesCount} favoriet{$favoritesCount !== 1 ? 'en' : ''}</p>
  </header>

  {#if $isLoading}
    <div class="loading">
      <p>⏳ Favorieten laden...</p>
    </div>
  {:else if favoriteRecipes.length > 0}
    <div class="recipe-grid">
      {#each favoriteRecipes as recipe (recipe.id)}
        <RecipeCard 
          {recipe} 
          onFavoriteClick={(id) => toggleFavorite(id)} 
        />
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">⭐</div>
      <h2>Nog geen favorieten</h2>
      <p>Klik op het sterretje bij een recept om het als favoriet te markeren.</p>
      <Button onclick={() => window.location.href = `${base}/recepten`}>
        📖 Bekijk alle recepten
      </Button>
    </div>
  {/if}
</div>

<style>
  .page {
    padding: var(--space-lg) var(--content-padding);
  }

  .page-header {
    margin-bottom: var(--space-lg);
  }

  .page-header h1 {
    margin-bottom: var(--space-xs);
  }

  .subtitle {
    color: var(--color-text-secondary);
    margin: 0;
  }

  .recipe-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-lg);
  }

  .loading {
    text-align: center;
    padding: var(--space-2xl);
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
  }

  .empty-state {
    text-align: center;
    padding: var(--space-2xl) var(--space-lg);
    background: var(--color-bg-card);
    border-radius: var(--border-radius-lg);
  }

  .empty-icon {
    font-size: 5rem;
    margin-bottom: var(--space-lg);
  }

  .empty-state h2 {
    margin-bottom: var(--space-sm);
  }

  .empty-state p {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-lg);
  }
</style>
