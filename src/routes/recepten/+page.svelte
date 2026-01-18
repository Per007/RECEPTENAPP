<script lang="ts">
  import { base } from "$app/paths";
  import {
    filteredRecipes,
    isLoading,
    searchQuery,
    selectedCategory,
    categoryCount,
    toggleFavorite,
  } from "$lib/stores/recipes";
  import type { RecipeCategory } from "$lib/db/types";
  import RecipeCard from "$lib/components/RecipeCard.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import CategoryFilter from "$lib/components/CategoryFilter.svelte";
  import Button from "$lib/components/Button.svelte";

  function searchOnline() {
    if (!$searchQuery) return;
    const query = encodeURIComponent($searchQuery + " recept");
    window.open(`https://www.google.com/search?q=${query}`, "_blank");
  }
</script>

<svelte:head>
  <title>Alle Recepten - Mijn Recepten</title>
  <meta name="description" content="Bekijk en zoek al uw opgeslagen recepten" />
</svelte:head>

<div class="page container">
  <header class="page-header">
    <h1>Mijn Recepten</h1>
  </header>

  <div class="filters">
    <div class="search-group">
      <div class="search-bar-wrapper">
        <SearchBar
          bind:value={$searchQuery}
          placeholder="Zoek op naam of ingrediënt..."
        />
      </div>
      <Button
        variant="secondary"
        onclick={searchOnline}
        disabled={!$searchQuery}
        ariaLabel="Zoek online op Google"
      >
        🌍
      </Button>
    </div>

    <CategoryFilter bind:selected={$selectedCategory} counts={$categoryCount} />
  </div>

  {#if $isLoading}
    <div class="loading">
      <p>⏳ Recepten laden...</p>
    </div>
  {:else if $filteredRecipes.length > 0}
    <div class="results-info">
      <span
        >{$filteredRecipes.length} recept{$filteredRecipes.length !== 1
          ? "en"
          : ""} gevonden</span
      >
    </div>
    <div class="recipe-grid">
      {#each $filteredRecipes as recipe (recipe.id)}
        <RecipeCard {recipe} onFavoriteClick={(id) => toggleFavorite(id)} />
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h2>Geen recepten gevonden</h2>
      {#if $searchQuery || $selectedCategory !== "all"}
        <p>Pas uw zoek- of filtercriteria aan</p>
        <Button
          variant="secondary"
          onclick={() => {
            $searchQuery = "";
            $selectedCategory = "all";
          }}
        >
          Filters wissen
        </Button>

        {#if $searchQuery}
          <div class="online-search-suggestion">
            <p>Niet gevonden? Zoek online:</p>
            <Button variant="secondary" onclick={searchOnline}>
              🌍 Zoek "{$searchQuery}" op Google
            </Button>
          </div>
        {/if}
      {:else}
        <p>U heeft nog geen recepten opgeslagen</p>
        <Button
          onclick={() => (window.location.href = `${base}/recepten/nieuw`)}
        >
          ➕ Voeg uw eerste recept toe
        </Button>
      {/if}
    </div>
  {/if}

  <a
    href="{base}/recepten/nieuw"
    class="fab"
    aria-label="Nieuw recept toevoegen"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  </a>
</div>

<style>
  .page {
    padding: var(--space-lg) var(--content-padding);
  }

  .page-header {
    margin-bottom: var(--space-lg);
  }

  .page-header h1 {
    margin: 0;
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  .search-group {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
  }

  @media (max-width: 480px) {
    .search-group {
      gap: var(--space-xs);
    }
  }

  .search-bar-wrapper {
    flex: 1;
  }

  .online-search-suggestion {
    margin-top: var(--space-lg);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
  }

  .results-info {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-md);
  }

  .recipe-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-lg);
  }

  @media (max-width: 600px) {
    .recipe-grid {
      grid-template-columns: 1fr;
    }
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
    font-size: 4rem;
    margin-bottom: var(--space-lg);
  }

  .empty-state h2 {
    margin-bottom: var(--space-sm);
  }

  .empty-state p {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-lg);
  }

  /* Floating Action Button */
  .fab {
    position: fixed;
    bottom: calc(var(--nav-height) + var(--space-lg));
    right: var(--space-lg);
    width: 64px;
    height: 64px;
    border-radius: var(--border-radius-full);
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    text-decoration: none;
    box-shadow: var(--shadow-lg);
    z-index: 100;
    transition:
      transform var(--transition-fast),
      box-shadow var(--transition-fast);
  }

  .fab:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-xl);
  }

  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .fab {
      bottom: calc(
        var(--nav-height) + env(safe-area-inset-bottom) + var(--space-lg)
      );
    }
  }
</style>
