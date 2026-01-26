<script lang="ts">
  import { exportRecipes, importRecipes, recipes } from "$lib/stores/recipes";
  import { theme } from "$lib/stores/theme";
  import { settings } from "$lib/stores/settings";
  import Button from "$lib/components/Button.svelte";

  let fileInput: HTMLInputElement;
  let isExporting = $state(false);
  let isImporting = $state(false);
  let importMode = $state<"merge" | "replace">("merge");
  let statusMessage = $state("");
  let statusType = $state<"success" | "error" | "">("");

  async function handleExport() {
    isExporting = true;
    statusMessage = "";

    try {
      await exportRecipes();
      statusMessage = `✓ ${$recipes.length} recept(en) geëxporteerd`;
      statusType = "success";
    } catch (error) {
      statusMessage = "✕ Fout bij exporteren";
      statusType = "error";
      console.error(error);
    } finally {
      isExporting = false;
    }
  }

  function triggerImport() {
    fileInput?.click();
  }

  async function handleImport(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    isImporting = true;
    statusMessage = "";

    try {
      const count = await importRecipes(file, importMode);
      statusMessage = `✓ ${count} recept(en) geïmporteerd`;
      statusType = "success";
    } catch (error) {
      statusMessage =
        error instanceof Error ? `✕ ${error.message}` : "✕ Fout bij importeren";
      statusType = "error";
      console.error(error);
    } finally {
      isImporting = false;
      target.value = "";
    }
  }

  async function handleClearData() {
    if (
      confirm(
        "Weet u zeker dat u alle recepten wilt verwijderen? Dit kan niet ongedaan worden gemaakt.",
      )
    ) {
      // Import with replace mode and empty data
      try {
        const { importRecipes: dbImport } = await import("$lib/db/database");
        await dbImport('{"version":1,"recipes":[]}', "replace");
        const { loadRecipes } = await import("$lib/stores/recipes");
        await loadRecipes();
        statusMessage = "✓ Alle recepten verwijderd";
        statusType = "success";
      } catch (error) {
        statusMessage = "✕ Fout bij verwijderen";
        statusType = "error";
      }
    }
  }
</script>

<svelte:head>
  <title>Instellingen - Mijn Recepten</title>
</svelte:head>

<div class="page container">
  <header class="page-header">
    <h1>⚙️ Instellingen</h1>
  </header>

  {#if statusMessage}
    <div class="status-message {statusType}" role="status" aria-live="polite">
      {statusMessage}
    </div>
  {/if}

  <section class="section">
    <h2>🎨 Uiterlijk & Functionaliteit</h2>
    <div class="theme-toggle-wrapper">
      <span class="theme-label" id="theme-label">Donkere modus</span>
      <label class="switch">
        <input
          type="checkbox"
          checked={$theme === "dark"}
          onchange={theme.toggle}
          aria-labelledby="theme-label"
        />
        <span class="slider"></span>
      </label>
    </div>

    <div class="theme-toggle-wrapper">
      <span class="theme-label" id="whatsapp-label"
        >Verberg WhatsApp deelknop</span
      >
      <label class="switch">
        <input
          type="checkbox"
          checked={$settings.hideWhatsappShare}
          onchange={settings.toggleWhatsappShare}
          aria-labelledby="whatsapp-label"
        />
        <span class="slider"></span>
      </label>
    </div>
  </section>

  <section class="section">
    <h2>📤 Gegevens Exporteren</h2>
    <p class="section-description">
      Download al uw recepten als een bestand om op te slaan of over te zetten
      naar een ander apparaat.
    </p>
    <Button
      onclick={handleExport}
      disabled={isExporting || $recipes.length === 0}
    >
      {isExporting
        ? "⏳ Exporteren..."
        : `📥 Download backup (${$recipes.length} recepten)`}
    </Button>
  </section>

  <section class="section">
    <h2>📥 Gegevens Importeren</h2>
    <p class="section-description">
      Laad recepten vanuit een eerder geëxporteerd bestand.
    </p>

    <div class="import-options">
      <label class="radio-option">
        <input
          type="radio"
          name="importMode"
          value="merge"
          bind:group={importMode}
        />
        <span class="radio-label">
          <strong>Toevoegen</strong>
          <span class="radio-desc">Voeg nieuwe recepten toe aan bestaande</span>
        </span>
      </label>
      <label class="radio-option">
        <input
          type="radio"
          name="importMode"
          value="replace"
          bind:group={importMode}
        />
        <span class="radio-label">
          <strong>Vervangen</strong>
          <span class="radio-desc"
            >Verwijder alles en vervang met geïmporteerde recepten</span
          >
        </span>
      </label>
    </div>

    <input
      bind:this={fileInput}
      type="file"
      accept=".json,application/json"
      class="file-input"
      onchange={handleImport}
      aria-label="Selecteer backup bestand"
    />

    <Button variant="secondary" onclick={triggerImport} disabled={isImporting}>
      {isImporting ? "⏳ Importeren..." : "📂 Selecteer bestand"}
    </Button>
  </section>

  <section class="section danger-zone">
    <h2>⚠️ Gevarenzone</h2>
    <p class="section-description">
      Verwijder alle opgeslagen recepten. Dit kan niet ongedaan worden gemaakt!
    </p>
    <Button variant="danger" onclick={handleClearData}>
      🗑️ Alle recepten verwijderen
    </Button>
  </section>

  <section class="section">
    <h2>ℹ️ Over deze app</h2>
    <div class="about-content">
      <p><strong>Mijn Recepten</strong> v1.0.0</p>
      <p>Een eenvoudige app voor het opslaan en beheren van recepten.</p>
      <ul class="feature-list">
        <li>✓ Werkt offline</li>
        <li>✓ Foto's toevoegen</li>
        <li>✓ Zoeken op ingrediënten</li>
        <li>✓ Gegevens exporteren/importeren</li>
        <li>✓ Grote knoppen en tekst</li>
      </ul>
    </div>
  </section>
</div>

<style>
  .page {
    padding: var(--space-lg) var(--content-padding);
    max-width: 700px;
  }

  .page-header {
    margin-bottom: var(--space-lg);
  }

  .status-message {
    padding: var(--space-md);
    border-radius: var(--border-radius-md);
    margin-bottom: var(--space-lg);
    font-weight: var(--font-weight-medium);
  }

  .status-message.success {
    background: #e8f5e9;
    color: var(--color-success);
  }

  .status-message.error {
    background: #ffebee;
    color: var(--color-error);
  }

  .section {
    background: var(--color-bg-card);
    padding: var(--space-lg);
    border-radius: var(--border-radius-lg);
    margin-bottom: var(--space-lg);
  }

  .section h2 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-sm);
  }

  .section-description {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-lg);
  }

  .import-options {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  .radio-option {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    cursor: pointer;
    padding: var(--space-md);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--border-radius-md);
    transition: border-color var(--transition-fast);
  }

  .radio-option:has(input:checked) {
    border-color: var(--color-primary);
    background: rgba(46, 125, 50, 0.05);
  }

  .radio-option input {
    width: 24px;
    height: 24px;
    margin-top: 2px;
  }

  .radio-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .radio-desc {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  .danger-zone {
    border: 2px solid var(--color-error);
  }

  .danger-zone h2 {
    color: var(--color-error);
  }

  .about-content p {
    margin-bottom: var(--space-sm);
  }

  .feature-list {
    list-style: none;
    padding: 0;
    margin-top: var(--space-md);
  }

  .feature-list li {
    padding: var(--space-xs) 0;
    color: var(--color-text-secondary);
  }

  .theme-toggle-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) 0;
  }

  .theme-label {
    font-weight: var(--font-weight-medium);
  }

  /* Simple Toggle Switch */
  .switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 34px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: var(--color-primary);
  }

  input:focus + .slider {
    box-shadow: 0 0 1px var(--color-primary);
  }

  input:checked + .slider:before {
    transform: translateX(26px);
  }

  @media (max-width: 700px) {
    .section :global(.btn) {
      width: 100% !important;
      white-space: normal !important;
      height: auto !important;
      min-height: var(--touch-target-comfortable);
    }
  }
</style>
