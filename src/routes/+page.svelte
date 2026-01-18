<script lang="ts">
  import { base } from "$app/paths";
  import { recipes, isLoading } from "$lib/stores/recipes";
  import RecipeCard from "$lib/components/RecipeCard.svelte";
  import Button from "$lib/components/Button.svelte";
  import { toggleFavorite } from "$lib/stores/recipes";

  // Get the 4 most recent recipes
  let recentRecipes = $derived($recipes.slice(0, 4));
</script>

<svelte:head>
  <title>Mijn Recepten - Home</title>
  <meta name="description" content="Eenvoudig recepten opslaan en beheren" />
</svelte:head>

<div class="page container">
  <section class="hero animate-fade-in">
    <div class="hero-actions">
      <Button
        size="lg"
        onclick={() => (window.location.href = `${base}/recepten/nieuw`)}
      >
        ➕ Nieuw Recept
      </Button>
      <Button
        size="lg"
        variant="secondary"
        onclick={() => (window.location.href = `${base}/recepten`)}
      >
        📖 Alle Recepten
      </Button>
    </div>
  </section>

  {#if $isLoading}
    <section class="loading">
      <p>⏳ Recepten laden...</p>
    </section>
  {:else if recentRecipes.length > 0}
    <section class="recent">
      <div class="section-header">
        <h2>Recente Recepten</h2>
        <a href="{base}/recepten" class="view-all">Bekijk alles →</a>
      </div>
      <div class="recipe-grid">
        {#each recentRecipes as recipe (recipe.id)}
          <RecipeCard
            {recipe}
            variant="compact"
            onFavoriteClick={(id) => toggleFavorite(id)}
          />
        {/each}
      </div>
    </section>
  {:else}
    <section class="empty-state animate-fade-in">
      <div class="empty-icon">🍳</div>
      <h2>Nog geen recepten</h2>
      <p>Begin met het toevoegen van uw eerste recept!</p>
      <Button
        size="lg"
        onclick={() => (window.location.href = `${base}/recepten/nieuw`)}
      >
        ➕ Voeg uw eerste recept toe
      </Button>
    </section>
  {/if}
</div>

<style>
  .page {
    padding: var(--space-lg) var(--content-padding);
  }

  /* Hero Section */
  .hero {
    text-align: center;
    padding: var(--space-xl) 0;
  }

  .hero-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    max-width: 400px;
    margin: 0 auto;
  }

  @media (min-width: 600px) {
    .hero-actions {
      flex-direction: row;
      justify-content: center;
    }
  }

  /* Recent Section */
  .recent {
    margin-top: var(--space-xl);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
  }

  .section-header h2 {
    margin: 0;
  }

  .view-all {
    font-size: var(--font-size-base);
    color: var(--color-primary);
    text-decoration: none;
    font-weight: var(--font-weight-medium);
  }

  .view-all:hover {
    text-decoration: underline;
  }

  .recipe-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-lg);
  }

  /* Loading */
  .loading {
    text-align: center;
    padding: var(--space-2xl);
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: var(--space-2xl) var(--space-lg);
    background: var(--color-bg-card);
    border-radius: var(--border-radius-lg);
    margin-top: var(--space-xl);
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
