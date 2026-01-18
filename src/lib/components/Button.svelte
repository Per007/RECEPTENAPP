<script lang="ts">
  interface Props {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    fullWidth?: boolean;
    type?: "button" | "submit" | "reset";
    ariaLabel?: string;
    onclick?: () => void;
    children?: import("svelte").Snippet;
  }

  let {
    variant = "primary",
    size = "md",
    disabled = false,
    fullWidth = false,
    type = "button",
    ariaLabel,
    onclick,
    children,
  }: Props = $props();
</script>

<button
  {type}
  class="btn btn-{variant} btn-{size}"
  class:btn-full={fullWidth}
  {disabled}
  aria-label={ariaLabel}
  {onclick}
>
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    border: none;
    border-radius: var(--border-radius-md);
    font-family: var(--font-family);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-decoration: none;
    text-align: center;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Sizes */
  .btn-sm {
    font-size: var(--font-size-sm);
    padding: var(--space-sm) var(--space-md);
    min-height: var(--touch-target-min);
  }

  .btn-md {
    font-size: var(--font-size-base);
    padding: var(--space-md) var(--space-lg);
    min-height: var(--touch-target-comfortable);
  }

  .btn-lg {
    font-size: var(--font-size-lg);
    padding: var(--space-lg) var(--space-xl);
    min-height: var(--touch-target-large);
  }

  /* Variants */
  .btn-primary {
    background-color: var(--color-primary);
    color: var(--color-text-on-primary);
  }

  .btn-primary:hover:not(:disabled) {
    background-color: var(--color-primary-dark);
    transform: translateY(-1px);
  }

  .btn-primary:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn-secondary {
    background-color: var(--color-bg-card);
    color: var(--color-text);
    border: var(--border-width) solid var(--color-border);
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: var(--color-bg-hover);
    border-color: var(--color-primary);
  }

  .btn-danger {
    background-color: var(--color-error);
    color: var(--color-text-on-primary);
  }

  .btn-danger:hover:not(:disabled) {
    background-color: #b71c1c;
  }

  .btn-ghost {
    background-color: transparent;
    color: var(--color-primary);
  }

  .btn-ghost:hover:not(:disabled) {
    background-color: var(--color-bg-hover);
  }

  /* Full width */
  .btn-full {
    width: 100%;
  }
</style>
