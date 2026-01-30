<script lang="ts">
  import { onMount } from "svelte";
  import "$lib/styles/global.css";
  import { loadRecipes } from "$lib/stores/recipes";
  import { theme } from "$lib/stores/theme";
  import { settings } from "$lib/stores/settings";
  import { base } from "$app/paths";
  import { page } from "$app/stores";

  interface Props {
    children?: import("svelte").Snippet;
  }

  let { children }: Props = $props();

  let isOffline = $state(false);

  onMount(() => {
    loadRecipes();
    theme.init();
    settings.init();

    // Monitor online/offline status
    isOffline = !navigator.onLine;

    const handleOnline = () => (isOffline = false);
    const handleOffline = () => (isOffline = true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });

  const navItems = [
    { href: `${base}/`, label: "Home", icon: "🏠" },
    { href: `${base}/recepten`, label: "Recepten", icon: "📖" },
    { href: `${base}/recepten/nieuw`, label: "Nieuw", icon: "➕" },
    { href: `${base}/favorieten`, label: "Favorieten", icon: "⭐" },
    { href: `${base}/instellingen`, label: "Instellingen", icon: "⚙️" },
  ];

  function isActive(href: string, currentPath: string): boolean {
    if (href === `${base}/`) {
      return (
        currentPath === `${base}/` || currentPath === base || currentPath === ""
      );
    }
    return currentPath.startsWith(href);
  }
</script>

<svelte:head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, viewport-fit=cover"
  />
  <meta name="theme-color" content="#2E7D32" />
</svelte:head>

<a href="#main-content" class="skip-link"> Ga naar hoofdinhoud </a>

<div class="app">
  {#if isOffline}
    <div class="offline-banner" role="status" aria-live="polite">
      📴 Offline modus - Wijzigingen worden lokaal opgeslagen
    </div>
  {/if}

  <header class="header">
    <div class="header-content container">
      <a href="{base}/" class="logo">
        <span class="logo-icon">🍳</span>
        <span class="logo-text">Mijn Recepten</span>
      </a>
    </div>
  </header>

  <main id="main-content" class="main">
    {#if children}
      {@render children()}
    {/if}
  </main>
</div>

<nav class="nav" aria-label="Hoofdnavigatie">
  {#each navItems as item}
    <a
      href={item.href}
      class="nav-item"
      class:active={isActive(item.href, $page.url.pathname)}
      aria-current={isActive(item.href, $page.url.pathname)
        ? "page"
        : undefined}
    >
      <span class="nav-icon" aria-hidden="true">{item.icon}</span>
      <span class="nav-label">{item.label}</span>
    </a>
  {/each}
</nav>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
  }

  /* Offline Banner */
  .offline-banner {
    background: var(--color-warning);
    color: #000;
    text-align: center;
    padding: var(--space-sm) var(--space-md);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
  }

  /* Header */
  .header {
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    height: var(--header-height);
    display: flex;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
    box-shadow: var(--shadow-md);
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    text-decoration: none;
    color: inherit;
  }

  .logo-icon {
    font-size: 2rem;
  }

  .logo-text {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
  }

  /* Main Content */
  .main {
    flex: 1;
    padding-bottom: calc(var(--nav-height) + var(--space-lg));
  }

  /* Bottom Navigation */
  .nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--nav-height);
    background: var(--color-bg-card);
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: var(--space-sm);
    padding-bottom: env(safe-area-inset-bottom, var(--space-sm));
    z-index: var(--z-sticky);
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    /* Prevent jitter on iOS */
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: var(--space-xs) var(--space-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--border-radius-md);
    min-width: var(--touch-target-min);
    min-height: var(--touch-target-min);
    transition:
      color var(--transition-fast),
      background-color var(--transition-fast);
  }

  .nav-item:hover {
    background: var(--color-bg-hover);
    color: var(--color-primary);
  }

  .nav-item.active {
    color: var(--color-primary);
  }

  .nav-icon {
    font-size: 1.5rem;
  }

  .nav-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
  }

  /* Safe area for iOS */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .nav {
      padding-bottom: calc(env(safe-area-inset-bottom) + var(--space-sm));
    }

    .main {
      padding-bottom: calc(
        var(--nav-height) + env(safe-area-inset-bottom) + var(--space-lg)
      );
    }
  }
</style>
