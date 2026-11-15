<script lang="ts">
  // Landingspagina van de QR-code: /koppelen?code=KOEK4827TAART
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import Button from "$lib/components/Button.svelte";
  import { normalizeCode } from "$lib/api/code";
  import { getBookCode } from "$lib/stores/book";
  import { linkWithCode, linkMessage, LINK_MESSAGES } from "$lib/stores/link";

  let askSwitch = $state(false);
  let isBusy = $state(false);
  let code = "";

  const home = () => goto(`${base}/`, { replaceState: true });
  const welcome = () => goto(`${base}/welkom`, { replaceState: true });

  async function link() {
    isBusy = true;
    const result = await linkWithCode(code).catch(() => "error" as const);
    if (result === "ok") {
      await home();
      return;
    }
    if (getBookCode()) {
      // Dit apparaat blijft gekoppeld aan het receptenboek dat het al had.
      alert(LINK_MESSAGES[result]);
      await home();
    } else {
      linkMessage.set(LINK_MESSAGES[result]);
      await welcome();
    }
  }

  onMount(() => {
    code = normalizeCode($page.url.searchParams.get("code") ?? "");
    const current = getBookCode();

    if (!code) {
      current ? home() : welcome();
    } else if (current === code) {
      home();
    } else if (current) {
      askSwitch = true;
    } else {
      link();
    }
  });
</script>

<svelte:head>
  <title>Koppelen - Mijn Recepten</title>
</svelte:head>

<div class="link container">
  {#if askSwitch && !isBusy}
    <h1>Overstappen?</h1>
    <p>
      Dit apparaat is al gekoppeld aan een ander receptenboek. Wil je
      overstappen?
    </p>
    <div class="choices">
      <Button size="lg" fullWidth onclick={link}>Ja, overstappen</Button>
      <Button size="lg" variant="secondary" fullWidth onclick={home}>Nee</Button>
    </div>
  {:else}
    <p class="busy" role="status">⏳ Bezig met koppelen...</p>
  {/if}
</div>

<style>
  .link {
    max-width: 520px;
    padding: var(--space-2xl) var(--content-padding);
    text-align: center;
  }

  h1 {
    font-size: var(--font-size-xl);
    margin-bottom: var(--space-md);
  }

  p {
    font-size: var(--font-size-base);
    margin-bottom: var(--space-xl);
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .busy {
    font-size: var(--font-size-lg);
  }
</style>
