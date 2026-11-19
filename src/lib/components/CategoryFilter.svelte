<script lang="ts">
  import { CATEGORIES, type RecipeCategory } from "$lib/db/types";
  import Icon from "./Icon.svelte";

  interface Props {
    selected: RecipeCategory | "all";
    counts?: Record<string, number>;
    onSelect?: (category: RecipeCategory | "all") => void;
  }

  let { selected = $bindable(), counts = {}, onSelect }: Props = $props();

  // Alleen soorten waar recepten in staan; een lege soort kiezen levert niets op.
  // De gekozen soort blijft altijd zichtbaar, zodat u hem weer kunt uitzetten.
  const options = $derived([
    { value: "all" as const, label: "Alles", icon: "" },
    ...CATEGORIES.filter((c) => counts[c.value] || selected === c.value),
  ]);

  function handleSelect(category: RecipeCategory | "all") {
    selected = category;
    onSelect?.(category);
  }
</script>

<div class="category-filter" role="group" aria-labelledby="filter-label">
  <p id="filter-label" class="filter-label">Soort gerecht</p>
  <div class="chips">
    {#each options as option (option.value)}
      {@const active = selected === option.value}
      <button
        type="button"
        class="chip"
        class:active
        aria-pressed={active}
        onclick={() => handleSelect(option.value)}
      >
        {#if active}
          <Icon name="check" size={20} strokeWidth={3} />
        {:else if option.icon}
          <span class="chip-icon" aria-hidden="true">{option.icon}</span>
        {/if}
        <span>{option.label}</span>
        {#if counts[option.value]}
          <span class="chip-count"
            >{counts[option.value]}<span class="sr-only"> recepten</span></span
          >
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .filter-label {
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-xs);
  }

  /* Knoppen lopen door op de volgende regel: niets verdwijnt buiten beeld */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    min-height: var(--touch-target-min);
    padding: var(--space-xs) var(--space-md);
    border: var(--border-width) solid var(--color-border-strong);
    border-radius: var(--border-radius-full);
    background: var(--color-bg-card);
    color: var(--color-text);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-normal);
    cursor: pointer;
    transition:
      background-color var(--transition-fast),
      border-color var(--transition-fast);
  }

  .chip:hover:not(.active) {
    background: var(--color-bg-hover);
    border-color: var(--color-text);
  }

  .chip-icon {
    font-size: 1.15em;
    line-height: 1;
  }

  .chip-count {
    min-width: 1.75em;
    padding: 0 6px;
    border-radius: var(--border-radius-full);
    background: var(--color-bg-subtle);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    text-align: center;
  }

  /* Gekozen: gevuld, vet én een vinkje — niet alleen een andere kleur */
  .chip.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-text-on-primary);
    font-weight: var(--font-weight-bold);
  }

  /* Smal scherm: iets compacter, zodat meer soorten op één regel passen */
  @media (max-width: 599px) {
    .chips {
      gap: 6px;
    }

    .chip {
      gap: 6px;
      padding: 4px var(--space-sm);
    }
  }

  .chip.active .chip-count {
    background: rgba(255, 255, 255, 0.22);
    color: inherit;
  }
</style>
