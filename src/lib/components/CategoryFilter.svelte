<script lang="ts">
  import { CATEGORIES, type RecipeCategory } from "$lib/db/types";

  interface Props {
    selected: RecipeCategory | "all";
    counts?: Record<string, number>;
    onSelect?: (category: RecipeCategory | "all") => void;
  }

  let { selected = $bindable(), counts = {}, onSelect }: Props = $props();

  function handleSelect(category: RecipeCategory | "all") {
    selected = category;
    onSelect?.(category);
  }
</script>

<div class="category-filter" role="tablist" aria-label="Categorieën filter">
  <button
    role="tab"
    class="category-btn"
    class:active={selected === "all"}
    onclick={() => handleSelect("all")}
    aria-selected={selected === "all"}
  >
    <span class="category-icon">📋</span>
    <span class="category-label">Alles</span>
    {#if counts["all"]}
      <span class="category-count">{counts["all"]}</span>
    {/if}
  </button>

  {#each CATEGORIES as category}
    <button
      role="tab"
      class="category-btn"
      class:active={selected === category.value}
      onclick={() => handleSelect(category.value)}
      aria-selected={selected === category.value}
    >
      <span class="category-icon">{category.icon}</span>
      <span class="category-label">{category.label}</span>
      {#if counts[category.value]}
        <span class="category-count">{counts[category.value]}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .category-filter {
    display: flex;
    gap: var(--space-sm);
    overflow-x: auto;
    padding: var(--space-sm) 0;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .category-filter::-webkit-scrollbar {
    display: none;
  }

  .category-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-md);
    min-width: 90px;
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--border-radius-lg);
    background: var(--color-bg-card);
    cursor: pointer;
    transition: all var(--transition-fast);
    flex-shrink: 0;
    color: var(--color-text);
  }

  .category-btn:hover {
    border-color: var(--color-primary);
    background: var(--color-bg-hover);
  }

  .category-btn.active {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-on-primary);
  }

  .category-icon {
    font-size: 1.75rem;
  }

  .category-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }

  .category-count {
    font-size: var(--font-size-xs);
    background: rgba(0, 0, 0, 0.1);
    padding: 2px 8px;
    border-radius: var(--border-radius-full);
  }

  .category-btn.active .category-count {
    background: rgba(255, 255, 255, 0.2);
  }
</style>
