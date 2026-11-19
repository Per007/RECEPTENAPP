<script lang="ts">
  import { base } from "$app/paths";
  import {
    filteredRecipes,
    isLoading,
    searchQuery,
    selectedCategory,
    categoryCount,
    tryToggleFavorite,
  } from "$lib/stores/recipes";
  import RecipeCard from "$lib/components/RecipeCard.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import CategoryFilter from "$lib/components/CategoryFilter.svelte";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";

  const total = $derived($categoryCount["all"] ?? 0);
  const isFiltered = $derived(!!$searchQuery || $selectedCategory !== "all");

  function searchOnline() {
    if (!$searchQuery) return;
    const query = encodeURIComponent($searchQuery + " recept");
    window.open(`https://www.google.com/search?q=${query}`, "_blank");
  }

  function clearFilters() {
    $searchQuery = "";
    $selectedCategory = "all";
  }

  function recepten(n: number) {
    return `${n} recept${n === 1 ? "" : "en"}`;
  }
</script>

<svelte:head>
  <title>Alle Recepten - Mijn Recepten</title>
  <meta name="description" content="Bekijk en zoek al uw opgeslagen recepten" />
</svelte:head>

<div class="page container">
  <header class="page-header">
    <div>
      <h1>Mijn recepten</h1>
      {#if total > 0}
        <p class="subtitle">{recepten(total)} in uw receptenboek</p>
      {/if}
    </div>
    <a href="{base}/recepten/nieuw" class="btn btn-primary new-btn">
      <Icon name="plus" size={22} strokeWidth={2.5} />
      Nieuw recept
    </a>
  </header>

  <section class="finder" aria-label="Zoeken en filteren">
    <SearchBar
      bind:value={$searchQuery}
      label="Zoek een recept"
      placeholder="Naam of ingrediënt, bijv. soep"
    />

    {#if $searchQuery}
      <button type="button" class="online-link" onclick={searchOnline}>
        <Icon name="globe" size={20} />
        Zoek „{$searchQuery}” ook op internet
      </button>
    {/if}

    {#if total > 0}
      <CategoryFilter bind:selected={$selectedCategory} counts={$categoryCount} />
    {/if}
  </section>

  {#if $isLoading}
    <div class="loading" role="status">
      <p>Recepten laden…</p>
    </div>
  {:else if $filteredRecipes.length > 0}
    {#if isFiltered}
      <div class="results-info">
        <p role="status">
          <strong>{recepten($filteredRecipes.length)}</strong> gevonden
        </p>
        <Button variant="ghost" size="sm" onclick={clearFilters}>
          <Icon name="x" size={18} />
          Toon alles
        </Button>
      </div>
    {/if}
    <ul class="recipe-grid" role="list">
      {#each $filteredRecipes as recipe (recipe.id)}
        <li>
          <RecipeCard {recipe} onFavoriteClick={(id) => tryToggleFavorite(id)} />
        </li>
      {/each}
    </ul>
  {:else}
    <div class="empty-state" role="status">
      <div class="empty-icon" aria-hidden="true">
        <Icon name="search" size={40} />
      </div>
      {#if isFiltered}
        <h2>Geen recepten gevonden</h2>
        <p>Probeer een ander woord, of kies een andere soort gerecht.</p>
        <div class="empty-actions">
          <Button variant="secondary" onclick={clearFilters}>
            Toon alle recepten
          </Button>
          {#if $searchQuery}
            <Button variant="secondary" onclick={searchOnline}>
              <Icon name="globe" size={20} />
              Zoek „{$searchQuery}” op internet
            </Button>
          {/if}
        </div>
      {:else}
        <h2>Nog geen recepten</h2>
        <p>U heeft nog geen recepten opgeslagen.</p>
        <a href="{base}/recepten/nieuw" class="btn btn-primary btn-lg">
          <Icon name="plus" size={24} strokeWidth={2.5} />
          Voeg uw eerste recept toe
        </a>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page {
    padding-top: var(--space-xl);
    padding-bottom: var(--space-2xl);
  }

  .page-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  .page-header h1 {
    font-size: clamp(2rem, 6vw, var(--font-size-3xl));
  }

  .subtitle {
    margin-top: var(--space-xs);
    color: var(--color-text-muted);
  }

  .finder {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    padding: var(--space-lg);
    margin-bottom: var(--space-xl);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-xl);
    box-shadow: var(--shadow-sm);
  }

  /* Link-achtige knop: onderstreept, zodat hij als bedienbaar herkenbaar is */
  .online-link {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    min-height: var(--touch-target-min);
    margin-top: calc(-1 * var(--space-sm));
    padding: 0 var(--space-xs);
    border: none;
    background: none;
    color: var(--color-primary);
    font-weight: var(--font-weight-semibold);
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 0.2em;
    text-align: left;
    cursor: pointer;
  }

  .online-link:hover {
    color: var(--color-primary-dark);
  }

  .results-info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
    color: var(--color-text-muted);
  }

  .results-info strong {
    color: var(--color-text);
  }

  .recipe-grid {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: var(--space-lg);
  }

  .recipe-grid > li {
    margin: 0;
    display: flex;
  }

  .recipe-grid > li > :global(.card) {
    flex: 1;
  }

  @media (max-width: 599px) {
    .page {
      padding-top: var(--space-lg);
    }

    /* Op de telefoon staat "Nieuw" al in de balk onderin: meer ruimte voor de recepten */
    .new-btn {
      display: none;
    }

    .page-header {
      margin-bottom: var(--space-md);
    }

    .finder {
      padding: var(--space-md);
      border-radius: var(--border-radius-lg);
    }

    .recipe-grid {
      gap: var(--space-sm);
    }
  }

  .loading,
  .empty-state {
    text-align: center;
    padding: var(--space-2xl) var(--space-md);
    color: var(--color-text-secondary);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
  }

  .empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 88px;
    border-radius: var(--border-radius-full);
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-sm);
  }
</style>
