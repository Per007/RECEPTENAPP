<script lang="ts">
  interface Props {
    value: string;
    placeholder?: string;
    onInput?: (value: string) => void;
    onClear?: () => void;
  }

  let { value = $bindable(), placeholder = 'Zoeken...', onInput, onClear }: Props = $props();

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    onInput?.(value);
  }

  function handleClear() {
    value = '';
    onClear?.();
  }
</script>

<div class="search-container">
  <span class="search-icon" aria-hidden="true">🔍</span>
  <input
    type="search"
    class="search-input"
    {placeholder}
    {value}
    oninput={handleInput}
    aria-label="Zoeken in recepten"
  />
  {#if value}
    <button 
      class="clear-btn" 
      onclick={handleClear}
      aria-label="Zoekopdracht wissen"
    >
      ✕
    </button>
  {/if}
</div>

<style>
  .search-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: var(--space-md);
    font-size: var(--font-size-lg);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: var(--space-md);
    padding-left: calc(var(--space-md) + 2rem);
    padding-right: calc(var(--space-md) + 3rem);
    font-size: var(--font-size-base);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--border-radius-lg);
    background: var(--color-bg-card);
    min-height: var(--touch-target-comfortable);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .search-input:focus {
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.2);
    outline: none;
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
  }

  /* Hide default search cancel button */
  .search-input::-webkit-search-cancel-button {
    display: none;
  }

  .clear-btn {
    position: absolute;
    right: var(--space-sm);
    width: var(--touch-target-min);
    height: var(--touch-target-min);
    border: none;
    border-radius: var(--border-radius-full);
    background: var(--color-bg-hover);
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color var(--transition-fast);
  }

  .clear-btn:hover {
    background: var(--color-border);
  }
</style>
