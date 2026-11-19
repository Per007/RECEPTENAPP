<script lang="ts">
  import type { Recipe } from "$lib/db/types";
  import { getCategoryIcon, getCategoryLabel } from "$lib/db/types";
  import { base } from "$app/paths";
  import Icon from "./Icon.svelte";

  interface Props {
    recipe: Recipe;
    onFavoriteClick?: (id: string) => void;
    variant?: "default" | "compact";
  }

  let { recipe, onFavoriteClick, variant = "default" }: Props = $props();

  const hasPhoto = $derived(recipe.photos && recipe.photos.length > 0);
</script>

<!-- De favorietknop staat naast de link (niet erin): een knop in een link is ongeldig en verwarrend. -->
<article class="card" class:compact={variant === "compact"}>
  <a href="{base}/recepten/{recipe.id}" class="card-link">
    <div class="card-image" class:placeholder={!hasPhoto}>
      {#if hasPhoto}
        <img src={recipe.photos[0]} alt="" loading="lazy" />
      {:else}
        <span class="placeholder-icon" aria-hidden="true"
          >{getCategoryIcon(recipe.category)}</span
        >
      {/if}
    </div>

    <div class="card-content">
      <h3 class="card-title">{recipe.title}</h3>
      <p class="card-meta">
        <span class="meta-item">
          <span aria-hidden="true">{getCategoryIcon(recipe.category)}</span>
          {getCategoryLabel(recipe.category)}
        </span>
        {#if recipe.cookTime}
          <span class="meta-item">
            <Icon name="clock" size={20} />
            {recipe.cookTime} min
          </span>
        {/if}
        {#if recipe.isFavorite}
          <span class="meta-item favorite-label">
            <Icon name="star" size={20} filled />
            Favoriet
          </span>
        {/if}
      </p>
    </div>
  </a>

  {#if onFavoriteClick}
    <button
      type="button"
      class="favorite-btn"
      class:is-favorite={recipe.isFavorite}
      onclick={() => onFavoriteClick?.(recipe.id)}
      aria-pressed={recipe.isFavorite}
      aria-label="Favoriet: {recipe.title}"
      title={recipe.isFavorite ? "Uit favorieten halen" : "Favoriet maken"}
    >
      <Icon name="star" size={26} filled={recipe.isFavorite} />
    </button>
  {/if}
</article>

<style>
  .card {
    position: relative;
    display: flex;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-sm);
    transition:
      box-shadow var(--transition-fast),
      border-color var(--transition-fast);
  }

  .card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-strong);
  }

  .card-link {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    color: inherit;
    text-decoration: none;
    border-radius: inherit;
  }

  .card-link:focus-visible {
    outline-offset: 2px;
  }

  /* Titel onderstrepen bij aanwijzen: zo is te zien dat de kaart een link is */
  .card-link:hover .card-title {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 0.18em;
  }

  .card-image {
    position: relative;
    aspect-ratio: 3 / 2;
    overflow: hidden;
    border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
    background: var(--color-bg-subtle);
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-image.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at 30% 20%, var(--color-primary-soft), transparent 60%),
      var(--color-bg-subtle);
  }

  .placeholder-icon {
    font-size: 3rem;
    opacity: 0.85;
  }

  .card-content {
    padding: var(--space-md) var(--space-md) var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .card-title {
    font-size: var(--font-size-lg);
    line-height: 1.25;
    /* Ruimte voor de favorietknop rechtsboven op smalle schermen */
    overflow-wrap: anywhere;
  }

  .card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs) var(--space-md);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .favorite-label {
    color: var(--color-favorite);
    font-weight: var(--font-weight-semibold);
  }

  /* Favoriet: rond, ruim tikvlak, ster vol of leeg (vorm, niet alleen kleur) */
  .favorite-btn {
    position: absolute;
    top: var(--space-sm);
    right: var(--space-sm);
    width: var(--touch-target-min);
    height: var(--touch-target-min);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-full);
    border: var(--border-width) solid var(--color-border-strong);
    background: var(--color-bg-card);
    color: var(--color-text-secondary);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);
  }

  .favorite-btn:hover {
    background: var(--color-favorite-soft);
    color: var(--color-favorite);
  }

  .favorite-btn.is-favorite {
    color: var(--color-favorite);
    border-color: var(--color-favorite);
    background: var(--color-favorite-soft);
  }

  /* ---- Smal scherm: lijstweergave, sneller scannen ---- */
  @media (max-width: 599px) {
    .card:not(.compact) .card-link {
      flex-direction: row;
      align-items: stretch;
    }

    .card:not(.compact) .card-image {
      flex: 0 0 104px;
      aspect-ratio: auto;
      min-height: 104px;
      border-radius: var(--border-radius-lg) 0 0 var(--border-radius-lg);
    }

    .card:not(.compact) .placeholder-icon {
      font-size: 2.25rem;
    }

    .card:not(.compact) .card-content {
      flex: 1;
      justify-content: center;
      padding: var(--space-sm) var(--space-md);
      /* Rechts ruimte voor de favorietknop */
      padding-right: calc(var(--touch-target-min) + var(--space-md));
    }

    .card:not(.compact) .favorite-btn {
      top: 50%;
      transform: translateY(-50%);
    }
  }

  /* ---- Compact (startpagina): lagere foto ---- */
  .compact .card-image {
    aspect-ratio: 2 / 1;
  }

  .compact .card-content {
    padding: var(--space-sm) var(--space-md) var(--space-md);
  }

  .compact .card-title {
    font-size: var(--font-size-base);
    font-family: var(--font-family);
    font-weight: var(--font-weight-bold);
  }
</style>
