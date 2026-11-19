<script lang="ts">
  interface Props {
    variant?: "primary" | "secondary" | "danger" | "danger-solid" | "ghost";
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

<!-- De stijl staat in global.css (.btn), zodat links dezelfde knopstijl kunnen krijgen. -->
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
