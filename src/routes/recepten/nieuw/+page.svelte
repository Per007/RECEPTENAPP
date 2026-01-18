<script lang="ts">
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { CATEGORIES, type RecipeCategory } from "$lib/db/types";
  import { addRecipe } from "$lib/stores/recipes";
  import Button from "$lib/components/Button.svelte";
  import PhotoCapture from "$lib/components/PhotoCapture.svelte";

  let title = $state("");
  let category = $state<RecipeCategory>("hoofdgerecht");
  let ingredients = $state("");
  let instructions = $state("");
  let photos = $state<string[]>([]);
  let sourceUrl = $state("");
  let servings = $state<number | undefined>(undefined);

  let cookTime = $state<number | undefined>(undefined);
  let notes = $state("");

  let isSubmitting = $state(false);
  let errorMessage = $state("");
  let currentStep = $state(1);

  const totalSteps = 3;

  function handlePhotoCapture(imageData: string) {
    console.log("Photo captured, length:", imageData.length);
    photos = [...photos, imageData];
    console.log("Current photos count:", photos.length);
  }

  function removePhoto(index: number) {
    photos = photos.filter((_, i) => i !== index);
  }

  function nextStep() {
    if (currentStep < totalSteps) {
      currentStep++;
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      errorMessage = "Vul een titel in";
      currentStep = 1;
      return;
    }

    //     if (!ingredients.trim()) {
    //       errorMessage = 'Vul ingrediënten in';
    //       currentStep = 2;
    //       return;
    //     }
    //
    //     if (!instructions.trim()) {
    //       errorMessage = 'Vul bereidingswijze in';
    //       currentStep = 2;
    //       return;
    //     }

    isSubmitting = true;
    errorMessage = "";

    try {
      console.log("Submitting recipe with photos count:", photos.length);
      const ingredientsList = ingredients
        .split("\n")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const recipe = await addRecipe({
        title: title.trim(),
        category,
        ingredients: ingredientsList.length > 0 ? ingredientsList : undefined,
        instructions: instructions.trim() || undefined,
        photos: [...photos],
        sourceUrl: sourceUrl.trim() || undefined,
        servings,

        cookTime,
        notes: notes.trim() || undefined,
        isFavorite: false,
      });

      console.log("Recipe added successfully:", recipe.id);
      goto(`${base}/recepten/${recipe.id}`);
    } catch (error) {
      errorMessage = "Er ging iets mis. Probeer het opnieuw.";
      console.error(error);
    } finally {
      isSubmitting = false;
    }
  }

  // Auto-image fetching state removed
</script>

<svelte:head>
  <title>Nieuw Recept - Mijn Recepten</title>
</svelte:head>

<div class="page container">
  <header class="page-header">
    <h1>Nieuw Recept</h1>
    <p class="step-indicator">Stap {currentStep} van {totalSteps}</p>
  </header>

  {#if errorMessage}
    <div class="error-message" role="alert">
      ⚠️ {errorMessage}
    </div>
  {/if}

  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }}
  >
    <!-- Step 1: Basic Info & Photos -->
    {#if currentStep === 1}
      <section class="form-section animate-fade-in">
        <h2>📝 Basisinformatie</h2>

        <div class="form-group">
          <label for="title">Titel *</label>
          <input
            type="text"
            id="title"
            bind:value={title}
            placeholder="Bijv. Oma's appeltaart"
            required
          />
        </div>

        <div class="form-group">
          <label for="category">Categorie</label>
          <select id="category" bind:value={category}>
            {#each CATEGORIES as cat}
              <option value={cat.value}>{cat.icon} {cat.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label>Foto's</label>
          <PhotoCapture onCapture={handlePhotoCapture} />

          {#if photos.length > 0}
            <div class="photo-grid">
              {#each photos as photo, index}
                <div class="photo-item">
                  <img src={photo} alt="Recept foto {index + 1}" />
                  <button
                    type="button"
                    class="remove-photo"
                    onclick={() => removePhoto(index)}
                    aria-label="Verwijder foto"
                  >
                    ✕
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="form-group">
          <label for="sourceUrl">Bron URL (optioneel)</label>
          <div class="url-input-group">
            <input
              type="url"
              id="sourceUrl"
              bind:value={sourceUrl}
              placeholder="https://..."
            />
          </div>
        </div>
      </section>
    {/if}

    <!-- Step 2: Ingredients & Instructions -->
    {#if currentStep === 2}
      <section class="form-section animate-fade-in">
        <h2>🥘 Ingrediënten & Bereiding</h2>

        <div class="form-group">
          <label for="ingredients">Ingrediënten (optioneel)</label>
          <textarea
            id="ingredients"
            bind:value={ingredients}
            placeholder="200g bloem
100g boter
2 eieren
..."
          ></textarea>
        </div>

        <div class="form-group">
          <label for="instructions">Bereidingswijze (optioneel)</label>
          <textarea
            id="instructions"
            bind:value={instructions}
            placeholder="1. Verwarm de oven voor op 180°C
2. Meng de droge ingrediënten
..."
          ></textarea>
        </div>
      </section>
    {/if}

    <!-- Step 3: Details -->
    {#if currentStep === 3}
      <section class="form-section animate-fade-in">
        <h2>⏱️ Extra Details</h2>

        <div class="form-row">
          <div class="form-group">
            <label for="servings">Porties</label>
            <input
              type="number"
              id="servings"
              bind:value={servings}
              min="1"
              placeholder="4"
            />
          </div>

          <div class="form-group">
            <label for="cookTime">Bereidingstijd (min)</label>
            <input
              type="number"
              id="cookTime"
              bind:value={cookTime}
              min="0"
              placeholder="45"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="notes">Notities (optioneel)</label>
          <textarea
            id="notes"
            bind:value={notes}
            placeholder="Extra tips of variaties..."
          ></textarea>
        </div>
      </section>
    {/if}

    <div class="form-actions">
      {#if currentStep > 1}
        <Button type="button" variant="secondary" onclick={prevStep}>
          ← Vorige
        </Button>
      {:else}
        <Button type="button" variant="ghost" onclick={() => history.back()}>
          Annuleren
        </Button>
      {/if}

      {#if currentStep < totalSteps}
        <Button type="button" onclick={nextStep}>Volgende →</Button>
      {:else}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "⏳ Opslaan..." : "✓ Recept Opslaan"}
        </Button>
      {/if}
    </div>
  </form>
</div>

<style>
  .page {
    padding: var(--space-lg) var(--content-padding);
    max-width: 700px;
  }

  .page-header {
    margin-bottom: var(--space-lg);
  }

  .page-header h1 {
    margin-bottom: var(--space-xs);
  }

  .step-indicator {
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
    margin: 0;
  }

  .error-message {
    background: #ffebee;
    color: var(--color-error);
    padding: var(--space-md);
    border-radius: var(--border-radius-md);
    margin-bottom: var(--space-lg);
    font-weight: var(--font-weight-medium);
  }

  .form-section {
    background: var(--color-bg-card);
    padding: var(--space-lg);
    border-radius: var(--border-radius-lg);
    margin-bottom: var(--space-lg);
  }

  .form-section h2 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-lg);
  }

  .form-group {
    margin-bottom: var(--space-lg);
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-md);
  }

  @media (max-width: 600px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }

  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }

  .photo-item {
    position: relative;
    aspect-ratio: 1;
    border-radius: var(--border-radius-md);
    overflow: hidden;
  }

  .photo-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .remove-photo {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--border-radius-full);
    background: rgba(0, 0, 0, 0.6);
    color: white;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .form-actions {
    display: flex;
    justify-content: space-between;
    gap: var(--space-md);
    margin-top: var(--space-lg);
  }

  @media (max-width: 600px) {
    .form-actions {
      flex-direction: column-reverse;
      gap: var(--space-md);
    }

    .form-actions :global(button) {
      width: 100%;
    }
  }

  .url-input-group {
    display: flex;
    gap: var(--space-sm);
  }

  .url-input-group input {
    flex: 1;
  }
</style>
