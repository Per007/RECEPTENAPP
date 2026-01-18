<script lang="ts">
  import type { Recipe } from "$lib/db/types";
  import { getCategoryIcon } from "$lib/db/types";
  import { base } from "$app/paths";

  interface Props {
    recipe: Recipe;
    onFavoriteClick?: (id: string) => void;
    variant?: "default" | "compact";
  }

  let { recipe, onFavoriteClick, variant = "default" }: Props = $props();

  function handleFavoriteClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteClick?.(recipe.id);
  }
</script>

<a
  href="{base}/recepten/{recipe.id}"
  class="card"
  class:compact={variant === "compact"}
>
  <div class="card-image">
    {#if recipe.photos && recipe.photos.length > 0}
      <img src={recipe.photos[0]} alt={recipe.title} loading="lazy" />
    {:else}
      <div class="card-placeholder">
        <span class="placeholder-icon">{getCategoryIcon(recipe.category)}</span>
      </div>
    {/if}
    <button
      class="favorite-btn"
      class:is-favorite={recipe.isFavorite}
      onclick={handleFavoriteClick}
      aria-label={recipe.isFavorite
        ? "Verwijder uit favorieten"
        : "Voeg toe aan favorieten"}
    >
      {recipe.isFavorite ? "★" : "☆"}
    </button>
  </div>

  <div class="card-content">
    <h3 class="card-title">{recipe.title}</h3>
    <div class="card-meta">
      <span class="category">
        {getCategoryIcon(recipe.category)}
      </span>
      {#if recipe.cookTime}
        <span class="time">
          ⏱️ {recipe.cookTime} min
        </span>
      {/if}
    </div>
  </div>
</a>

<style>
  .card {
    display: block;
    background: var(--color-bg-card);
    border-radius: var(--border-radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-md);
    transition:
      transform var(--transition-fast),
      box-shadow var(--transition-fast);
    text-decoration: none;
    color: inherit;
  }

  .card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  .card:focus-visible {
    outline: 3px solid var(--color-border-focus);
    outline-offset: 2px;
  }

  .card-image {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: var(--color-bg-hover);
  }

  .card.compact .card-image {
    aspect-ratio: 2.5 / 1;
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      var(--color-primary-light) 0%,
      var(--color-primary) 100%
    );
  }

  .placeholder-icon {
    font-size: 4rem;
    opacity: 0.8;
  }

  .card.compact .placeholder-icon {
    font-size: 2.5rem;
  }

  .favorite-btn {
    position: absolute;
    top: var(--space-sm);
    right: var(--space-sm);
    width: var(--touch-target-min);
    height: var(--touch-target-min);
    border: none;
    border-radius: var(--border-radius-full);
    background: rgba(255, 255, 255, 0.9);
    font-size: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform var(--transition-fast);
    color: var(--color-text-muted);
  }

  .card.compact .favorite-btn {
    width: 36px;
    height: 36px;
    font-size: 1.2rem;
  }

  .favorite-btn:hover {
    transform: scale(1.1);
  }

  .favorite-btn.is-favorite {
    color: var(--color-favorite);
  }

  .card-content {
    padding: var(--space-md);
  }

  .card.compact .card-content {
    padding: var(--space-sm) var(--space-md);
  }

  .card-title {
    font-size: var(--font-size-lg);
    margin: 0 0 var(--space-sm) 0;
    line-height: var(--line-height-tight);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card.compact .card-title {
    font-size: var(--font-size-base);
    margin-bottom: var(--space-xs);
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .card.compact .card-meta {
    font-size: var(--font-size-xs);
  }

  .category,
  .time {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
</style>
