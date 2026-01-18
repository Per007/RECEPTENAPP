<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { onMount } from "svelte";
  import { getRecipe } from "$lib/db/database";
  import { updateRecipe, deleteRecipe } from "$lib/stores/recipes";
  import { CATEGORIES, type Recipe, type RecipeCategory } from "$lib/db/types";
  import Button from "$lib/components/Button.svelte";
  import PhotoCapture from "$lib/components/PhotoCapture.svelte";

  let recipe = $state<Recipe | null>(null);
  let isLoading = $state(true);

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
  let showDeleteConfirm = $state(false);
  let isDeleting = $state(false);

  const recipeId = $page.params.id ?? "";

  onMount(async () => {
    try {
      const loadedRecipe = await getRecipe(recipeId);
      if (loadedRecipe) {
        recipe = loadedRecipe;
        title = loadedRecipe.title;
        category = loadedRecipe.category;
        ingredients = loadedRecipe.ingredients?.join("\n") || "";
        instructions = loadedRecipe.instructions || "";
        photos = [...loadedRecipe.photos];
        sourceUrl = loadedRecipe.sourceUrl || "";
        servings = loadedRecipe.servings;

        cookTime = loadedRecipe.cookTime;
        notes = loadedRecipe.notes || "";
      }
    } catch (error) {
      console.error("Error loading recipe:", error);
    } finally {
      isLoading = false;
    }
  });

  function handlePhotoCapture(imageData: string) {
    console.log("Photo captured in edit, length:", imageData.length);
    photos = [...photos, imageData];
    console.log("Current photos count:", photos.length);
  }

  function removePhoto(index: number) {
    photos = photos.filter((_, i) => i !== index);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      errorMessage = "Vul een titel in";
      return;
    }

    // Optional fields logic: allow empty ingredients/instructions
    // Validation removed for optional fields

    isSubmitting = true;
    errorMessage = "";

    try {
      console.log("Updating recipe with photos count:", photos.length);
      const ingredientsList = ingredients
        .split("\n")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      await updateRecipe(recipeId, {
        title: title.trim(),
        category,
        ingredients: ingredientsList.length > 0 ? ingredientsList : undefined,
        instructions: instructions.trim() || undefined,
        photos: $state.snapshot(photos),
        sourceUrl: sourceUrl.trim() || undefined,
        servings,

        cookTime,
        notes: notes.trim() || undefined,
      });

      console.log("Recipe updated successfully");
      goto(`${base}/recepten/${recipeId}`);
    } catch (error) {
      errorMessage = "Er ging iets mis. Probeer het opnieuw.";
      console.error(error);
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDelete() {
    isDeleting = true;
    errorMessage = "";
    try {
      await deleteRecipe(recipeId);
      goto(`${base}/recepten`);
    } catch (error) {
      console.error("Error deleting recipe:", error);
      errorMessage = "Fout bij het verwijderen. Probeer het opnieuw.";
      showDeleteConfirm = false;
    } finally {
      isDeleting = false;
    }
  }

  // Auto-image fetching state removed
</script>

<svelte:head>
  <title>Bewerk {recipe?.title || "Recept"} - Mijn Recepten</title>
</svelte:head>

<div class="page container">
  {#if isLoading}
    <div class="loading">
      <p>⏳ Recept laden...</p>
    </div>
  {:else if !recipe}
    <div class="not-found">
      <h1>Recept niet gevonden</h1>
      <Button onclick={() => goto(`${base}/recepten`)}>
        ← Terug naar recepten
      </Button>
    </div>
  {:else}
    <header class="page-header">
      <h1>✏️ Recept bewerken</h1>
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
      <section class="form-section">
        <h2>📝 Basisinformatie</h2>

        <div class="form-group">
          <label for="title">Titel *</label>
          <input type="text" id="title" bind:value={title} required />
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

      <section class="form-section">
        <h2>🥘 Ingrediënten & Bereiding</h2>

        <div class="form-group">
          <label for="ingredients">Ingrediënten (optioneel)</label>
          <textarea id="ingredients" bind:value={ingredients}></textarea>
        </div>

        <div class="form-group">
          <label for="instructions">Bereidingswijze (optioneel)</label>
          <textarea id="instructions" bind:value={instructions}></textarea>
        </div>
      </section>

      <section class="form-section">
        <h2>⏱️ Extra Details</h2>

        <div class="form-row">
          <div class="form-group">
            <label for="servings">Porties</label>
            <input type="number" id="servings" bind:value={servings} min="1" />
          </div>

          <div class="form-group">
            <label for="cookTime">Bereidingstijd (min)</label>
            <input type="number" id="cookTime" bind:value={cookTime} min="0" />
          </div>
        </div>

        <div class="form-group">
          <label for="notes">Notities (optioneel)</label>
          <textarea id="notes" bind:value={notes}></textarea>
        </div>
      </section>

      <div class="form-actions">
        <Button
          type="button"
          variant="danger"
          onclick={() => (showDeleteConfirm = true)}
        >
          🗑️ Verwijderen
        </Button>
        <div class="right-actions">
          <Button
            type="button"
            variant="ghost"
            onclick={() => goto(`${base}/recepten/${recipeId}`)}
          >
            Annuleren
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "⏳ Opslaan..." : "✓ Wijzigingen Opslaan"}
          </Button>
        </div>
      </div>
    </form>

    {#if showDeleteConfirm}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="modal-backdrop" onclick={() => (showDeleteConfirm = false)}>
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          onclick={(e) => e.stopPropagation()}
        >
          <h2>Recept verwijderen?</h2>
          <p>
            Weet u zeker dat u "{title}" wilt verwijderen? Dit kan niet ongedaan
            worden gemaakt.
          </p>
          <div class="modal-actions">
            <Button
              variant="secondary"
              onclick={() => (showDeleteConfirm = false)}
            >
              Annuleren
            </Button>
            <Button
              variant="danger"
              onclick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "⏳ Verwijderen..." : "🗑️ Verwijderen"}
            </Button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .page {
    padding: var(--space-lg) var(--content-padding);
    max-width: 700px;
  }

  .loading,
  .not-found {
    text-align: center;
    padding: var(--space-2xl);
  }

  .page-header {
    margin-bottom: var(--space-lg);
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

  /* Form Layout */
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

  .right-actions {
    display: flex;
    gap: var(--space-md);
  }

  /* Mobile Actions Stacking */
  @media (max-width: 600px) {
    .form-actions {
      flex-direction: column-reverse;
      gap: var(--space-md);
    }

    .right-actions {
      flex-direction: column-reverse;
      width: 100%;
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

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    z-index: var(--z-modal-backdrop);
  }

  .modal {
    background: var(--color-bg-card);
    border-radius: var(--border-radius-lg);
    padding: var(--space-xl);
    max-width: 400px;
    width: 100%;
    z-index: var(--z-modal);
  }

  .modal h2 {
    margin-bottom: var(--space-md);
  }

  .modal p {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-lg);
  }

  .modal-actions {
    display: flex;
    gap: var(--space-md);
    justify-content: flex-end;
  }
</style>
