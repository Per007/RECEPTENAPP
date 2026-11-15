<script lang="ts">
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import Button from "$lib/components/Button.svelte";
  import {
    startNewBook,
    linkWithCode,
    linkMessage,
    LINK_MESSAGES,
    type LinkResult,
  } from "$lib/stores/link";

  let showCodeEntry = $state(false);
  let code = $state("");
  let isBusy = $state(false);
  let message = $state($linkMessage ?? "");
  linkMessage.set(null);

  async function run(action: () => Promise<LinkResult>) {
    isBusy = true;
    message = "";
    try {
      const result = await action();
      if (result === "ok") {
        await goto(`${base}/`, { replaceState: true });
      } else {
        message = LINK_MESSAGES[result];
      }
    } catch (error) {
      console.error(error);
      message = LINK_MESSAGES.error;
    } finally {
      isBusy = false;
    }
  }

  function handleLink(event: SubmitEvent) {
    event.preventDefault();
    run(() => linkWithCode(code));
  }
</script>

<svelte:head>
  <title>Welkom - Mijn Recepten</title>
</svelte:head>

<div class="welcome container">
  <div class="welcome-icon" aria-hidden="true">🍳</div>
  <h1>Mijn Recepten</h1>

  {#if message}
    <div class="message" role="alert">⚠️ {message}</div>
  {/if}

  {#if !showCodeEntry}
    <div class="choices">
      <Button
        size="lg"
        fullWidth
        disabled={isBusy}
        onclick={() => run(startNewBook)}
      >
        {isBusy ? "⏳ Even geduld..." : "Nieuw receptenboek maken"}
      </Button>
      <Button
        size="lg"
        variant="secondary"
        fullWidth
        disabled={isBusy}
        onclick={() => {
          showCodeEntry = true;
          message = "";
        }}
      >
        Ik heb al een code
      </Button>
    </div>
  {:else}
    <form class="choices" onsubmit={handleLink}>
      <label class="code-label" for="book-code">Jouw receptenboek-code</label>
      <input
        id="book-code"
        class="code-input"
        type="text"
        bind:value={code}
        placeholder="KOEK-4827-TAART"
        autocapitalize="characters"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        disabled={isBusy}
      />
      <Button
        size="lg"
        type="submit"
        fullWidth
        disabled={isBusy || !code.trim()}
      >
        {isBusy ? "⏳ Even geduld..." : "Koppelen"}
      </Button>
      <Button
        size="lg"
        variant="ghost"
        fullWidth
        disabled={isBusy}
        onclick={() => {
          showCodeEntry = false;
          message = "";
        }}
      >
        Terug
      </Button>
    </form>
  {/if}
</div>

<style>
  .welcome {
    max-width: 520px;
    padding: var(--space-2xl) var(--content-padding);
    text-align: center;
  }

  .welcome-icon {
    font-size: 4rem;
    line-height: 1;
  }

  h1 {
    font-size: var(--font-size-2xl);
    margin: var(--space-md) 0 var(--space-xl);
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .message {
    background: #ffebee;
    color: var(--color-error);
    padding: var(--space-md);
    border-radius: var(--border-radius-md);
    margin-bottom: var(--space-lg);
    font-weight: var(--font-weight-medium);
    text-align: left;
  }

  .code-label {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    text-align: left;
  }

  .code-input {
    width: 100%;
    min-height: var(--touch-target-large);
    padding: var(--space-md);
    font-family: inherit;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.04em;
    text-align: center;
    text-transform: uppercase;
    color: var(--color-text);
    background: var(--color-bg-card);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--border-radius-md);
  }

  .code-input::placeholder {
    color: var(--color-text-placeholder);
    font-weight: var(--font-weight-normal);
  }

  .code-input:focus {
    outline: none;
    border-color: var(--color-border-focus);
  }
</style>
