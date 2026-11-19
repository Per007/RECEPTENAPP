<script lang="ts">
  import { onMount } from "svelte";
  import "$lib/styles/global.css";
  import { loadRecipes, notice, error } from "$lib/stores/recipes";
  import { startAutoRefresh } from "$lib/sync/refresh";
  import { bookCode, initBook } from "$lib/stores/book";
  import { goto } from "$app/navigation";
  import { theme } from "$lib/stores/theme";
  import { settings } from "$lib/stores/settings";
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import { pwaInfo } from "virtual:pwa-info";
  import Icon, { type IconName } from "$lib/components/Icon.svelte";

  interface Props {
    children?: import("svelte").Snippet;
  }

  let { children }: Props = $props();

  let isOffline = $state(false);
  let ready = $state(false);

  // Welkom en koppelen zijn de enige schermen voor een apparaat zonder receptenboek.
  const path = $derived($page.url.pathname.replace(/\/$/, ""));
  const isSetupRoute = $derived(
    path === `${base}/welkom` || path === `${base}/koppelen`,
  );

  $effect(() => {
    if (!ready) return;
    if (!$bookCode && !isSetupRoute) {
      goto(`${base}/welkom`, { replaceState: true });
    } else if ($bookCode && path === `${base}/welkom`) {
      goto(`${base}/`, { replaceState: true });
    }
  });

  // Een melding verdwijnt vanzelf weer.
  $effect(() => {
    if (!$notice) return;
    const timer = setTimeout(() => notice.set(null), 8000);
    return () => clearTimeout(timer);
  });

  onMount(() => {
    initBook();
    ready = true;

    // De service worker bewaart de app zelf, zodat hij ook zonder internet opent.
    if (pwaInfo) {
      import("virtual:pwa-register")
        .then(({ registerSW }) => registerSW({ immediate: true }))
        .catch((e) => console.error("Service worker registreren mislukt:", e));
    }
    loadRecipes();
    theme.init();
    settings.init();

    // Monitor online/offline status
    isOffline = !navigator.onLine;

    const handleOnline = () => {
      isOffline = false;
      loadRecipes();
    };
    const handleOffline = () => (isOffline = true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    // Kijk of een ander apparaat iets heeft gewijzigd (zichtbaar, focus, elke minuut).
    const stopAutoRefresh = startAutoRefresh(loadRecipes);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      stopAutoRefresh();
    };
  });


  const navItems: { href: string; label: string; icon: IconName }[] = [
    { href: `${base}/`, label: "Home", icon: "home" },
    { href: `${base}/recepten`, label: "Recepten", icon: "book" },
    { href: `${base}/recepten/nieuw`, label: "Nieuw", icon: "plus-circle" },
    { href: `${base}/favorieten`, label: "Favorieten", icon: "star" },
    { href: `${base}/instellingen`, label: "Instellingen", icon: "sliders" },
  ];

  function isActive(href: string, currentPath: string): boolean {
    if (href === `${base}/`) {
      return (
        currentPath === `${base}/` || currentPath === base || currentPath === ""
      );
    }
    // "Nieuw" (/recepten/nieuw) mag "Recepten" niet ook actief maken
    if (href === `${base}/recepten`) {
      return (
        currentPath.startsWith(href) &&
        !currentPath.startsWith(`${base}/recepten/nieuw`)
      );
    }
    return currentPath.startsWith(href);
  }

  const showNav = $derived(ready && !!$bookCode && !isSetupRoute);
</script>

<svelte:head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, viewport-fit=cover"
  />
  <meta name="theme-color" content="#FAF6EF" />
  {#if pwaInfo}
    <link rel="manifest" href={pwaInfo.webManifest.href} />
  {/if}
</svelte:head>

<a href="#main-content" class="skip-link"> Ga naar hoofdinhoud </a>

<div class="app" class:has-nav={showNav}>
  {#if isOffline}
    <div class="offline-banner" role="status" aria-live="polite">
      📴 Geen internet: je kunt lezen, niet wijzigen
    </div>
  {/if}

  {#if $notice || $error}
    <div class="notice-banner" role="alert">
      ⚠️ {$notice || $error}
    </div>
  {/if}

  <header class="header">
    <div class="header-content container">
      <a href="{base}/" class="logo">
        <span class="logo-icon"><Icon name="pot" size={26} /></span>
        <span class="logo-text">Mijn Recepten</span>
      </a>

      {#if showNav}
        <!-- Eén navigatie: onderaan op telefoon en tablet, in de kop op een groot scherm -->
        <nav class="nav" aria-label="Hoofdnavigatie">
          {#each navItems as item}
            {@const active = isActive(item.href, $page.url.pathname)}
            <a
              href={item.href}
              class="nav-item"
              class:active
              aria-current={active ? "page" : undefined}
            >
              <Icon name={item.icon} size={26} filled={active && item.icon === "star"} />
              <span class="nav-label">{item.label}</span>
            </a>
          {/each}
        </nav>
      {/if}
    </div>
  </header>

  <main id="main-content" class="main">
    {#if children && ready && ($bookCode || isSetupRoute)}
      {@render children()}
    {/if}
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
  }

  .offline-banner {
    background: var(--color-warning);
    color: #000;
    text-align: center;
    padding: var(--space-sm) var(--space-md);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
  }

  .notice-banner {
    background: var(--color-error-soft);
    color: var(--color-error);
    border-bottom: var(--border-width) solid var(--color-error);
    text-align: center;
    padding: var(--space-sm) var(--space-md);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
  }

  /* ---- Kop: licht en rustig, scrolt mee weg (meer ruimte bij inzoomen) ---- */
  .header {
    background: var(--color-bg-card);
    border-bottom: 1px solid var(--color-border);
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-lg);
    min-height: var(--header-height);
  }

  .logo {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    min-height: var(--touch-target-min);
    color: var(--color-text);
    text-decoration: none;
  }

  .logo:hover {
    color: var(--color-text);
  }

  .logo-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: var(--border-radius-full);
    background: var(--color-primary);
    color: var(--color-text-on-primary);
  }

  .logo-text {
    font-family: var(--font-family-display);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.01em;
  }

  .main {
    flex: 1;
  }

  /* ---- Navigatie: onderaan (telefoon/tablet) ---- */
  .nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-sticky);
    display: flex;
    justify-content: space-around;
    gap: 2px;
    padding: 6px var(--space-xs);
    padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px));
    background: var(--color-bg-card);
    border-top: 1px solid var(--color-border-strong);
    box-shadow: 0 -4px 16px rgba(60, 40, 20, 0.08);
  }

  .nav-item {
    position: relative;
    flex: 1;
    max-width: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: 60px;
    padding: 4px 2px;
    border-radius: var(--border-radius-md);
    color: var(--color-text-muted);
    text-decoration: none;
    transition:
      color var(--transition-fast),
      background-color var(--transition-fast);
  }

  .nav-item:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  /* Actief: kleur, vlak, vette tekst én een balkje — niet alleen kleur */
  .nav-item.active {
    background: var(--color-primary-soft);
    color: var(--color-primary-dark);
  }

  .nav-item.active::before {
    content: "";
    position: absolute;
    top: 0;
    left: 25%;
    right: 25%;
    height: 4px;
    border-radius: 0 0 4px 4px;
    background: var(--color-primary);
  }

  .nav-label {
    font-size: 0.9375rem;
    font-weight: var(--font-weight-semibold);
    line-height: 1.2;
  }

  .nav-item.active .nav-label {
    font-weight: var(--font-weight-bold);
  }

  .app.has-nav .main {
    padding-bottom: calc(var(--nav-height) + var(--space-lg) + env(safe-area-inset-bottom, 0px));
  }

  /* Weinig hoogte (bijv. ingezoomd op 200%): compactere balk, labels blijven staan */
  @media (max-height: 520px) and (max-width: 959px) {
    .nav-item {
      min-height: 48px;
      flex-direction: row;
      gap: 6px;
    }

    .nav-item :global(.icon) {
      width: 22px;
      height: 22px;
    }

    .app.has-nav .main {
      padding-bottom: calc(60px + var(--space-lg));
    }
  }

  /* ---- Navigatie in de kop (groot scherm) ---- */
  @media (min-width: 960px) {
    .nav {
      position: static;
      padding: 0;
      gap: var(--space-xs);
      background: none;
      border: none;
      box-shadow: none;
    }

    .nav-item {
      flex: none;
      max-width: none;
      flex-direction: row;
      gap: var(--space-xs);
      min-height: var(--touch-target-min);
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--border-radius-full);
    }

    .nav-item.active::before {
      top: auto;
      bottom: -10px;
      left: var(--space-md);
      right: var(--space-md);
      height: 4px;
      border-radius: 4px;
    }

    .nav-label {
      font-size: var(--font-size-base);
    }

    .app.has-nav .main {
      padding-bottom: var(--space-xl);
    }
  }
</style>
