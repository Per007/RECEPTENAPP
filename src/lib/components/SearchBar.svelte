<script lang="ts">
  import Icon from "./Icon.svelte";

  interface Props {
    value: string;
    placeholder?: string;
    /** Zichtbaar label boven het zoekveld. */
    label?: string;
    id?: string;
    onInput?: (value: string) => void;
    onClear?: () => void;
  }

  let {
    value = $bindable(),
    placeholder = "Zoeken...",
    label,
    id = "zoeken",
    onInput,
    onClear,
  }: Props = $props();

  let input = $state<HTMLInputElement>();

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    onInput?.(value);
  }

  function handleClear() {
    value = "";
    onClear?.();
    input?.focus();
  }
</script>

<div class="search">
  {#if label}
    <label class="search-label" for={id}>{label}</label>
  {/if}
  <div class="search-container">
    <span class="search-icon"><Icon name="search" size={24} /></span>
    <input
      bind:this={input}
      {id}
      type="search"
      class="search-input"
      class:has-value={!!value}
      {placeholder}
      {value}
      oninput={handleInput}
      aria-label={label ? undefined : "Zoeken in recepten"}
      autocomplete="off"
      enterkeyhint="search"
    />
    {#if value}
      <button type="button" class="clear-btn" onclick={handleClear}>
        <Icon name="x" size={20} />
        Wissen
      </button>
    {/if}
  </div>
</div>

<style>
  .search-label {
    font-size: var(--font-size-base);
    margin-bottom: var(--space-xs);
  }

  .search-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: var(--space-md);
    display: flex;
    color: var(--color-text-muted);
    pointer-events: none;
  }

  .search-input {
    min-height: var(--touch-target-comfortable);
    padding-left: calc(var(--space-md) + 24px + var(--space-sm));
    padding-right: var(--space-md);
    border-radius: var(--border-radius-full);
    font-size: var(--font-size-base);
    box-shadow: var(--shadow-sm);
  }

  /* Ruimte voor de knop "Wissen" alleen als die er staat */
  .search-input.has-value {
    padding-right: 7.5rem;
  }

  /* Eigen wisknop: de kleine browserknop is te klein om op te tikken */
  .search-input::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
  }

  .clear-btn {
    position: absolute;
    right: 4px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: var(--touch-target-min);
    padding: 0 var(--space-md);
    border: none;
    border-radius: var(--border-radius-full);
    background: var(--color-bg-subtle);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .clear-btn:hover {
    background: var(--color-bg-hover);
  }
</style>
