<script lang="ts">
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import {
    recipes,
    isLoading,
    searchQuery,
    selectedCategory,
    tryToggleFavorite,
  } from "$lib/stores/recipes";
  import RecipeCard from "$lib/components/RecipeCard.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import Icon from "$lib/components/Icon.svelte";

  // De 4 nieuwste recepten en (maximaal 4) favorieten
  let recentRecipes = $derived($recipes.slice(0, 4));
  let favorites = $derived($recipes.filter((r) => r.isFavorite).slice(0, 4));
  let favoriteCount = $derived($recipes.filter((r) => r.isFavorite).length);

  let query = $state("");

  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? "Goedenavond" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

  function recepten(n: number) {
    return `${n} recept${n === 1 ? "" : "en"}`;
  }

  /** Zoeken gebeurt op de receptenpagina, met dezelfde zoekterm. */
  function search(e: SubmitEvent) {
    e.preventDefault();
    $searchQuery = query.trim();
    $selectedCategory = "all";
    goto(`${base}/recepten`);
  }
</script>

<svelte:head>
  <title>Mijn Recepten - Home</title>
  <meta name="description" content="Eenvoudig recepten opslaan en beheren" />
</svelte:head>

<div class="page container">
  <section class="welcome">
    <h1>{greeting}!</h1>
    <p class="subtitle">
      {#if $recipes.length > 0}
        Wat gaat u vandaag koken? Er staan {recepten($recipes.length)} in uw receptenboek.
      {:else}
        Welkom bij uw receptenboek.
      {/if}
    </p>

    {#if $recipes.length > 0}
      <form class="search-form" role="search" onsubmit={search}>
        <div class="search-field">
          <SearchBar
            bind:value={query}
            id="zoeken-home"
            label="Zoek een recept"
            placeholder="Naam of ingrediënt, bijv. soep"
          />
        </div>
        <button type="submit" class="btn btn-secondary search-btn">
          <Icon name="search" size={22} />
          Zoeken
        </button>
      </form>
    {/if}

    <div class="actions">
      <a href="{base}/recepten/nieuw" class="btn btn-primary btn-lg">
        <Icon name="plus" size={24} strokeWidth={2.5} />
        Nieuw recept
      </a>
      {#if $recipes.length > 0}
        <a href="{base}/recepten" class="btn btn-secondary btn-lg">
          <Icon name="book" size={24} />
          Alle recepten
        </a>
      {/if}
    </div>
  </section>

  {#if $isLoading}
    <section class="loading" role="status">
      <p>Recepten laden…</p>
    </section>
  {:else if recentRecipes.length > 0}
    {#if favorites.length > 0}
      <section class="shelf" aria-labelledby="favorieten-titel">
        <div class="section-header">
          <h2 id="favorieten-titel">
            <Icon name="star" size={26} filled />
            Uw favorieten
          </h2>
          {#if favoriteCount > favorites.length}
            <a href="{base}/favorieten" class="view-all">
              Alle {favoriteCount} favorieten
            </a>
          {/if}
        </div>
        <ul class="recipe-grid" role="list">
          {#each favorites as recipe (recipe.id)}
            <li>
              <RecipeCard
                {recipe}
                variant="compact"
                onFavoriteClick={(id) => tryToggleFavorite(id)}
              />
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <section class="shelf" aria-labelledby="recent-titel">
      <div class="section-header">
        <h2 id="recent-titel">Recent toegevoegd</h2>
        <a href="{base}/recepten" class="view-all">Bekijk alle recepten</a>
      </div>
      <ul class="recipe-grid" role="list">
        {#each recentRecipes as recipe (recipe.id)}
          <li>
            <RecipeCard
              {recipe}
              variant="compact"
              onFavoriteClick={(id) => tryToggleFavorite(id)}
            />
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <section class="empty-state">
      <div class="empty-icon" aria-hidden="true">
        <Icon name="pot" size={44} />
      </div>
      <h2>Nog geen recepten</h2>
      <p>Begin met het toevoegen van uw eerste recept.</p>
      <p class="import-hint">
        Recepten op een ander apparaat of browser?
        <a href="{base}/instellingen">Importeer uw backup</a>
      </p>
    </section>
  {/if}
</div>

<style>
  .page {
    padding-top: var(--space-xl);
    padding-bottom: var(--space-2xl);
    display: flex;
    flex-direction: column;
    gap: var(--space-2xl);
  }

  /* ---- Welkom ---- */
  .welcome {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    padding: var(--space-xl);
    background:
      radial-gradient(circle at 100% 0%, var(--color-primary-soft), transparent 55%),
      var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-xl);
    box-shadow: var(--shadow-sm);
  }

  .welcome h1 {
    font-size: clamp(2rem, 6vw, var(--font-size-3xl));
  }

  .subtitle {
    margin-top: calc(-1 * var(--space-sm));
    color: var(--color-text-secondary);
    font-size: var(--font-size-lg);
    line-height: var(--line-height-normal);
    max-width: 40ch;
  }

  .search-form {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-sm);
    max-width: 720px;
  }

  .search-field {
    flex: 1 1 280px;
    min-width: 0;
  }

  .search-btn {
    min-height: var(--touch-target-comfortable);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  /* ---- Rijen recepten ---- */
  .shelf {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .section-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-xs) var(--space-md);
  }

  .section-header h2 {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .section-header h2 :global(.icon) {
    color: var(--color-favorite);
  }

  .view-all {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch-target-min);
    font-weight: var(--font-weight-bold);
  }

  .recipe-grid {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
    gap: var(--space-lg);
  }

  .recipe-grid > li {
    margin: 0;
    display: flex;
  }

  .recipe-grid > li > :global(.card) {
    flex: 1;
  }

  /* ---- Laden / leeg ---- */
  .loading,
  .empty-state {
    text-align: center;
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
    width: 96px;
    height: 96px;
    border-radius: var(--border-radius-full);
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }

  .import-hint {
    color: var(--color-text-muted);
  }

  @media (max-width: 599px) {
    .page {
      padding-top: var(--space-lg);
      gap: var(--space-xl);
    }

    .welcome {
      padding: var(--space-lg) var(--space-md);
    }

    .subtitle {
      font-size: var(--font-size-base);
    }

    .search-btn,
    .actions .btn {
      flex: 1 1 auto;
    }

    .recipe-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-sm);
    }
  }
</style>
