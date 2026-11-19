<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { onMount } from "svelte";
  import { getRecipe } from "$lib/db/database";
  import {
    addRecipe,
    tryToggleFavorite,
    saveErrorMessage,
    deleteRecipe,
    recipes,
  } from "$lib/stores/recipes";
  import {
    getCategoryLabel,
    getCategoryIcon,
    type Recipe,
  } from "$lib/db/types";
  import { settings } from "$lib/stores/settings";
  import Button from "$lib/components/Button.svelte";
  import Lightbox from "$lib/components/Lightbox.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { splitSteps } from "$lib/recipe/steps";

  let recipe = $state<Recipe | null>(null);
  let isLoading = $state(true);
  let showDeleteConfirm = $state(false);
  let isDeleting = $state(false);
  let isSharedPreview = $state(false);
  let isSaving = $state(false);
  let selectedImage = $state<string | null>(null);

  const recipeId = $page.params.id ?? "";

  onMount(async () => {
    try {
      if (recipeId === "shared") {
        // Handle shared recipe link
        const data = $page.url.searchParams.get("data");
        if (data) {
          try {
            const sharedRecipe = JSON.parse(decodeURIComponent(data));
            // Ensure basic structural validity
            if (sharedRecipe.title && sharedRecipe.category) {
              recipe = {
                ...sharedRecipe,
                id: "shared-preview", // Temporary ID
                isFavorite: false, // Reset favorite status
                photos: [], // No photos in shared links
                photoIds: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              } as Recipe;
              isSharedPreview = true;
            }
          } catch (e) {
            console.error("Error parsing shared recipe:", e);
          }
        }
      } else {
        // Normal recipe loading
        recipe = await getRecipe(recipeId);
      }
    } catch (error) {
      console.error("Error loading recipe:", error);
    } finally {
      isLoading = false;
    }
  });

  // Update recipe when favorites toggle (only for non-shared)
  $effect(() => {
    if (!isSharedPreview && recipeId !== "shared") {
      const updated = $recipes.find((r) => r.id === recipeId);
      if (updated) {
        recipe = updated;
      }
    }
  });

  async function handleToggleFavorite() {
    if (recipe && !isSharedPreview) {
      await tryToggleFavorite(recipe.id);
    }
  }

  async function shareViaWhatsApp() {
    if (!recipe) return;

    // Create a shareable object (exclude heavy items like photos)
    const shareObject = {
      title: recipe.title,
      category: recipe.category,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      servings: recipe.servings,
      cookTime: recipe.cookTime,
      notes: recipe.notes,
      sourceUrl: recipe.sourceUrl,
    };

    // Serialize and encode
    const payload = encodeURIComponent(JSON.stringify(shareObject));
    // Construct the share link (pointing to /recepten/shared)
    // We use window.location.origin + base to ensure full URL
    const shareUrl = `${window.location.origin}${base}/recepten/shared?data=${payload}`;

    // Try native share first (better support for links on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: `Bekijk dit recept: ${recipe.title}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Continue to fallback
      }
    }

    // Fallback for desktop or if share API fails
    const text = encodeURIComponent(
      `Bekijk dit recept: ${recipe.title} - ${shareUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  async function handleDelete() {
    if (!recipe || isSharedPreview) return;

    isDeleting = true;
    try {
      await deleteRecipe(recipe.id);
      goto(`${base}/recepten`);
    } catch (error) {
      console.error("Error deleting recipe:", error);
      alert("Verwijderen is niet gelukt. Controleer de internetverbinding en probeer het opnieuw.");
    } finally {
      isDeleting = false;
      showDeleteConfirm = false;
    }
  }

  async function handleSaveShared() {
    if (!recipe || !isSharedPreview) return;

    // Check for duplicates in existing recipes
    const duplicate = $recipes.find((r) => {
      // Create simplified versions for comparison (ignoring IDs, dates, images, etc.)
      const isTitleMatch =
        r.title.toLowerCase() === recipe!.title.toLowerCase();
      const isIngredientsMatch =
        JSON.stringify(r.ingredients) === JSON.stringify(recipe!.ingredients);
      const isInstructionsMatch = r.instructions === recipe!.instructions;

      return isTitleMatch && isIngredientsMatch && isInstructionsMatch;
    });

    if (duplicate) {
      alert(
        "Dit recept staat al in uw lijst! U wordt nu doorgestuurd naar het bestaande recept.",
      );
      goto(`${base}/recepten/${duplicate.id}`);
      return;
    }

    isSaving = true;
    try {
      // Add the recipe to the database
      // The addRecipe function handles ID generation
      const savedRecipe = await addRecipe({
        title: recipe.title,
        category: recipe.category,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        photos: [], // Emtpy photos
        sourceUrl: recipe.sourceUrl,
        isFavorite: false,
        servings: recipe.servings,
        cookTime: recipe.cookTime,
        notes: recipe.notes,
      });

      // Update the local recipes store to reflect the change immediately if needed
      // (The store should auto-update if it listens to DB, but let's be safe via navigation)

      // Redirect to the newly created recipe
      goto(`${base}/recepten/${savedRecipe.id}`);
    } catch (error) {
      console.error("Error saving shared recipe:", error);
      alert(saveErrorMessage(error));
    } finally {
      isSaving = false;
    }
  }


  // ---- Tijdens het koken ----
  // Afvinken is alleen voor nu: het wordt niet bewaard en geldt alleen op dit apparaat.
  const steps = $derived(splitSteps(recipe?.instructions));
  let doneSteps = $state<boolean[]>([]);
  let checkedIngredients = $state<boolean[]>([]);

  /** De eerste stap die nog niet klaar is: daar is de kok gebleven. */
  const currentStep = $derived(steps.findIndex((_, i) => !doneSteps[i]));

  function toggleStep(index: number) {
    doneSteps[index] = !doneSteps[index];
  }

  function sourceHost(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }
</script>

<svelte:head>
  <title>{recipe?.title || "Recept"} - Mijn Recepten</title>
</svelte:head>

<div class="page">
  {#if isLoading}
    <div class="loading container" role="status">
      <p>Recept laden…</p>
    </div>
  {:else if !recipe}
    <div class="not-found container">
      <div class="empty-icon" aria-hidden="true"><Icon name="search" size={40} /></div>
      <h1>Recept niet gevonden</h1>
      <p>Dit recept bestaat niet of is verwijderd.</p>
      <a href="{base}/recepten" class="btn btn-primary">
        <Icon name="arrow-left" size={22} />
        Terug naar alle recepten
      </a>
    </div>
  {:else}
    <div class="container">
      <a href="{base}/recepten" class="back-link">
        <Icon name="arrow-left" size={22} />
        Alle recepten
      </a>

      {#if isSharedPreview}
        <div class="shared-banner" role="note">
          <span class="icon" aria-hidden="true">👋</span>
          <div class="text">
            <strong>Gedeeld recept</strong>
            <p>Dit is een voorbeeld. Sla het op om het te bewaren.</p>
          </div>
        </div>
      {/if}

      <header class="recipe-hero" class:has-photo={recipe.photos?.length > 0}>
        {#if recipe.photos && recipe.photos.length > 0}
          <button
            type="button"
            class="hero-photo"
            onclick={() => (selectedImage = recipe?.photos?.[0] ?? null)}
            aria-label="Foto van {recipe.title} vergroten"
          >
            <img src={recipe.photos[0]} alt="" />
            <span class="zoom-hint" aria-hidden="true">
              <Icon name="zoom" size={20} />
              Vergroten
            </span>
          </button>
        {/if}

        <div class="hero-text">
          <p class="category-chip">
            <span aria-hidden="true">{getCategoryIcon(recipe.category)}</span>
            {getCategoryLabel(recipe.category)}
          </p>
          <h1>{recipe.title}</h1>

          {#if recipe.servings || recipe.cookTime || recipe.ingredients?.length}
            <ul class="facts" role="list">
              {#if recipe.servings}
                <li>
                  <Icon name="users" size={24} />
                  <span><strong>{recipe.servings}</strong> {recipe.servings === 1 ? "portie" : "porties"}</span>
                </li>
              {/if}
              {#if recipe.cookTime}
                <li>
                  <Icon name="clock" size={24} />
                  <span><strong>{recipe.cookTime}</strong> minuten</span>
                </li>
              {/if}
              {#if recipe.ingredients?.length}
                <li>
                  <Icon name="list" size={24} />
                  <span><strong>{recipe.ingredients.length}</strong> ingrediënten</span>
                </li>
              {/if}
            </ul>
          {/if}

          <div class="hero-actions">
            {#if isSharedPreview}
              <Button variant="primary" onclick={handleSaveShared} disabled={isSaving}>
                {isSaving ? "Opslaan…" : "Opslaan in mijn recepten"}
              </Button>
              <Button variant="secondary" onclick={() => goto(`${base}/recepten`)}>
                Annuleren
              </Button>
            {:else}
              <button
                type="button"
                class="btn btn-secondary favorite-toggle"
                class:is-favorite={recipe.isFavorite}
                aria-pressed={recipe.isFavorite}
                onclick={handleToggleFavorite}
              >
                <Icon name="star" size={22} filled={recipe.isFavorite} />
                {recipe.isFavorite ? "Favoriet" : "Maak favoriet"}
              </button>
              <a href="{base}/recepten/{recipe.id}/bewerken" class="btn btn-secondary">
                <Icon name="edit" size={22} />
                Bewerken
              </a>
              {#if !$settings.hideWhatsappShare}
                <Button variant="secondary" onclick={shareViaWhatsApp}>
                  <Icon name="share" size={22} />
                  Delen
                </Button>
              {/if}
            {/if}
          </div>
        </div>
      </header>

      {#if recipe.ingredients?.length && steps.length}
        <nav class="jump-links" aria-label="Ga naar onderdeel">
          <a href="#ingredienten">Ingrediënten</a>
          <a href="#bereiding">Bereiding</a>
        </nav>
      {/if}

      <div class="recipe-body" class:single={!recipe.ingredients?.length || !steps.length}>
        {#if recipe.ingredients && recipe.ingredients.length > 0}
          <section id="ingredienten" class="ingredients panel" aria-labelledby="ingredienten-titel">
            <h2 id="ingredienten-titel">Ingrediënten</h2>
            {#if recipe.servings}
              <p class="section-hint">Voor {recipe.servings} {recipe.servings === 1 ? "portie" : "porties"}</p>
            {/if}
            <ul class="ingredients-list" role="list">
              {#each recipe.ingredients as ingredient, i}
                <li>
                  <label class="ingredient" class:checked={checkedIngredients[i]}>
                    <input type="checkbox" bind:checked={checkedIngredients[i]} />
                    <span>{ingredient}</span>
                  </label>
                </li>
              {/each}
            </ul>
            <p class="section-hint small">Tik een ingrediënt aan als u het klaar heeft staan.</p>
          </section>
        {/if}

        {#if steps.length > 0}
          <section id="bereiding" class="steps" aria-labelledby="bereiding-titel">
            <h2 id="bereiding-titel">Bereiding</h2>
            {#if steps.length > 1}
              <p class="section-hint">
                Tik op <strong>Klaar</strong> na elke stap. De stap waar u bent, krijgt een groene rand.
              </p>
            {/if}
            <ol class="steps-list" role="list">
              {#each steps as step, i}
                {@const done = !!doneSteps[i]}
                {@const current = i === currentStep && steps.length > 1}
                <li class="step" class:done class:current>
                  <span class="step-number" aria-hidden="true">
                    {#if done}<Icon name="check" size={26} strokeWidth={3} />{:else}{i + 1}{/if}
                  </span>
                  <div class="step-body">
                    {#if steps.length > 1}
                      <p class="step-label">
                        Stap {i + 1} van {steps.length}
                        {#if current}<span class="badge">Nu bezig</span>{/if}
                        {#if done}<span class="badge badge-done">Klaar</span>{/if}
                      </p>
                    {/if}
                    <p class="step-text">{step}</p>
                    {#if steps.length > 1}
                      <button
                        type="button"
                        class="step-toggle"
                        aria-pressed={done}
                        onclick={() => toggleStep(i)}
                      >
                        <Icon name="check" size={20} strokeWidth={2.5} />
                        Klaar
                        <span class="sr-only">met stap {i + 1}</span>
                      </button>
                    {/if}
                  </div>
                </li>
              {/each}
            </ol>
          </section>
        {/if}
      </div>

      {#if recipe.notes}
        <section class="panel notes-panel" aria-labelledby="notities-titel">
          <h2 id="notities-titel">Notities</h2>
          <p class="notes">{recipe.notes}</p>
        </section>
      {/if}

      {#if recipe.photos && recipe.photos.length > 1}
        <section class="extra-section" aria-labelledby="fotos-titel">
          <h2 id="fotos-titel">Foto's</h2>
          <ul class="photo-grid" role="list">
            {#each recipe.photos as photo, index}
              <li>
                <button
                  type="button"
                  class="photo-btn"
                  onclick={() => (selectedImage = photo)}
                  aria-label="Foto {index + 1} vergroten"
                >
                  <img src={photo} alt="" loading="lazy" />
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if recipe.sourceUrl}
        <p class="source">
          Bron:
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
            {sourceHost(recipe.sourceUrl)}
            <Icon name="external" size={18} />
            <span class="sr-only">(opent in een nieuw venster)</span>
          </a>
        </p>
      {/if}

      {#if !isSharedPreview}
        <div class="danger-zone">
          <Button variant="danger" onclick={() => (showDeleteConfirm = true)}>
            <Icon name="trash" size={22} />
            Recept verwijderen
          </Button>
        </div>
      {/if}
    </div>

    <!-- Bevestigen voor verwijderen -->
    {#if showDeleteConfirm}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="modal-backdrop" onclick={() => (showDeleteConfirm = false)}>
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verwijder-titel"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
        >
          <h2 id="verwijder-titel">Recept verwijderen?</h2>
          <p>
            Weet u zeker dat u "{recipe.title}" wilt verwijderen? Dit kan niet
            ongedaan worden gemaakt.
          </p>
          <div class="modal-actions">
            <Button variant="secondary" onclick={() => (showDeleteConfirm = false)}>
              Nee, bewaren
            </Button>
            <Button variant="danger-solid" onclick={handleDelete} disabled={isDeleting}>
              <Icon name="trash" size={22} />
              {isDeleting ? "Verwijderen…" : "Ja, verwijderen"}
            </Button>
          </div>
        </div>
      </div>
    {/if}

    {#if selectedImage}
      <Lightbox
        src={selectedImage}
        alt="Vergrote weergave"
        onclose={() => (selectedImage = null)}
      />
    {/if}
  {/if}
</div>

<style>
  .page {
    padding-top: var(--space-md);
    padding-bottom: var(--space-2xl);
  }

  .loading,
  .not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    text-align: center;
    padding-top: var(--space-2xl);
  }

  .empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 88px;
    border-radius: var(--border-radius-full);
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }

  /* ---- Terug ---- */
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    min-height: var(--touch-target-min);
    padding-right: var(--space-sm);
    margin-bottom: var(--space-md);
    font-weight: var(--font-weight-bold);
  }

  /* ---- Gedeeld recept ---- */
  .shared-banner {
    display: flex;
    gap: var(--space-md);
    align-items: flex-start;
    padding: var(--space-md) var(--space-lg);
    margin-bottom: var(--space-lg);
    background: var(--color-primary-soft);
    border: var(--border-width) solid var(--color-primary);
    border-radius: var(--border-radius-lg);
  }

  .shared-banner .icon {
    font-size: 1.75rem;
    line-height: 1;
  }

  .shared-banner p {
    color: var(--color-text-secondary);
  }

  /* ---- Kop met foto ---- */
  .recipe-hero {
    display: grid;
    gap: var(--space-lg);
    margin-bottom: var(--space-xl);
  }

  @media (min-width: 900px) {
    .recipe-hero.has-photo {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
      align-items: center;
      gap: var(--space-2xl);
    }
  }

  .hero-photo {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    border-radius: var(--border-radius-xl);
    overflow: hidden;
    background: var(--color-bg-subtle);
    cursor: zoom-in;
    box-shadow: var(--shadow-md);
  }

  .hero-photo img {
    width: 100%;
    aspect-ratio: 4 / 3;
    /* Ook ingezoomd of op een laag scherm blijft de titel direct onder de foto zichtbaar */
    max-height: min(440px, 50vh);
    object-fit: cover;
  }

  .zoom-hint {
    position: absolute;
    right: var(--space-sm);
    bottom: var(--space-sm);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px var(--space-sm);
    border-radius: var(--border-radius-full);
    background: rgba(255, 255, 255, 0.92);
    color: #221E1A;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
  }

  .hero-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-md);
  }

  .category-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 4px var(--space-md);
    border-radius: var(--border-radius-full);
    background: var(--color-primary-soft);
    color: var(--color-primary-dark);
    font-weight: var(--font-weight-bold);
  }

  .hero-text h1 {
    font-size: clamp(2rem, 7vw, var(--font-size-3xl));
    line-height: 1.1;
  }

  .facts {
    list-style: none;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm) var(--space-lg);
    color: var(--color-text-secondary);
  }

  .facts li {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    margin: 0;
  }

  .facts :global(.icon) {
    color: var(--color-primary);
  }

  .facts strong {
    color: var(--color-text);
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-top: var(--space-xs);
  }

  .favorite-toggle.is-favorite {
    background: var(--color-favorite-soft);
    border-color: var(--color-favorite);
    color: var(--color-favorite);
  }

  /* ---- Snel naar een onderdeel (alleen als de onderdelen onder elkaar staan) ---- */
  .jump-links {
    display: flex;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
  }

  .jump-links a {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: var(--touch-target-min);
    padding: var(--space-xs) var(--space-md);
    border: var(--border-width) solid var(--color-border-strong);
    border-radius: var(--border-radius-full);
    background: var(--color-bg-card);
    color: var(--color-text);
    font-weight: var(--font-weight-bold);
  }

  @media (min-width: 960px) {
    .jump-links {
      display: none;
    }
  }

  /* ---- Ingrediënten + bereiding ---- */
  .recipe-body {
    display: grid;
    gap: var(--space-xl);
    align-items: start;
  }

  @media (min-width: 960px) {
    .recipe-body:not(.single) {
      grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
      gap: var(--space-2xl);
    }

    /* Ingrediënten blijven in beeld tijdens het scrollen door de stappen */
    .recipe-body:not(.single) .ingredients {
      position: sticky;
      top: var(--space-md);
      max-height: calc(100vh - 2 * var(--space-md));
      overflow-y: auto;
    }
  }

  .panel {
    padding: var(--space-lg);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-xl);
    box-shadow: var(--shadow-sm);
  }

  h2 {
    font-size: var(--font-size-xl);
  }

  .section-hint {
    margin-top: var(--space-xs);
    color: var(--color-text-muted);
  }

  .section-hint.small {
    margin-top: var(--space-md);
    font-size: var(--font-size-xs);
  }

  .ingredients-list {
    list-style: none;
    padding: 0;
    margin-top: var(--space-md);
  }

  .ingredients-list li {
    margin: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .ingredients-list li:last-child {
    border-bottom: none;
  }

  .ingredient {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    min-height: var(--touch-target-min);
    padding: var(--space-sm) 0;
    margin: 0;
    font-size: 1.125rem;
    font-weight: var(--font-weight-normal);
    line-height: var(--line-height-relaxed);
    cursor: pointer;
  }

  .ingredient input {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    margin-top: 2px;
    cursor: pointer;
  }

  .ingredient.checked span {
    color: var(--color-text-muted);
    text-decoration: line-through;
    text-decoration-thickness: 2px;
  }

  /* ---- Stappen ---- */
  .steps-list {
    list-style: none;
    padding: 0;
    margin-top: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .step {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-md);
    margin: 0;
    padding: var(--space-lg);
    background: var(--color-bg-card);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--border-radius-lg);
    transition:
      border-color var(--transition-fast),
      background-color var(--transition-fast);
  }

  /* De stap waar u bent: dikke groene rand en een label — goed te zien als u even opkijkt */
  .step.current {
    border-color: var(--color-primary);
    border-width: 3px;
    box-shadow: 0 0 0 4px var(--color-focus-ring);
  }

  .step.done {
    background: var(--color-bg-subtle);
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: var(--border-radius-full);
    border: 3px solid var(--color-primary);
    color: var(--color-primary);
    font-family: var(--font-family-display);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    line-height: 1;
  }

  .step.current .step-number {
    background: var(--color-primary);
    color: var(--color-text-on-primary);
  }

  .step.done .step-number {
    border-color: var(--color-text-muted);
    color: var(--color-text-muted);
  }

  .step-body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-xs);
  }

  .step-label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .badge {
    padding: 2px var(--space-sm);
    border-radius: var(--border-radius-full);
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    text-transform: none;
    letter-spacing: 0;
  }

  .badge-done {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-strong);
    color: var(--color-text-secondary);
  }

  .step-text {
    font-size: 1.125rem;
    line-height: var(--line-height-relaxed);
    max-width: 65ch;
  }

  .step.done .step-text {
    color: var(--color-text-muted);
  }

  .step-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: var(--touch-target-min);
    margin-top: var(--space-xs);
    padding: var(--space-xs) var(--space-md);
    border: var(--border-width) solid var(--color-border-strong);
    border-radius: var(--border-radius-full);
    background: var(--color-bg-card);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
  }

  .step-toggle:hover {
    background: var(--color-bg-hover);
  }

  .step-toggle[aria-pressed="true"] {
    background: var(--color-primary-soft);
    border-color: var(--color-primary);
    color: var(--color-primary-dark);
  }

  @media (max-width: 599px) {
    .panel {
      padding: var(--space-md);
    }

    .step {
      padding: var(--space-md);
      gap: var(--space-sm);
    }

    .step-number {
      width: 44px;
      height: 44px;
      font-size: var(--font-size-lg);
    }
  }

  /* ---- Notities, foto's, bron ---- */
  .notes-panel {
    margin-top: var(--space-xl);
    background: var(--color-bg-subtle);
    box-shadow: none;
  }

  .notes {
    margin-top: var(--space-sm);
    white-space: pre-wrap;
    line-height: var(--line-height-relaxed);
  }

  .extra-section {
    margin-top: var(--space-xl);
  }

  .photo-grid {
    list-style: none;
    padding: 0;
    margin-top: var(--space-md);
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-sm);
  }

  .photo-grid li {
    margin: 0;
  }

  .photo-btn {
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    border-radius: var(--border-radius-md);
    overflow: hidden;
    cursor: zoom-in;
  }

  .photo-btn img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
  }

  .source {
    margin-top: var(--space-xl);
    color: var(--color-text-muted);
  }

  .source a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: var(--touch-target-min);
    font-weight: var(--font-weight-semibold);
    word-break: break-all;
  }

  .danger-zone {
    margin-top: var(--space-2xl);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--color-border);
  }

  /* ---- Bevestigingsvenster ---- */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(25, 20, 15, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
    z-index: var(--z-modal-backdrop);
  }

  .modal {
    background: var(--color-bg-card);
    border-radius: var(--border-radius-xl);
    padding: var(--space-xl);
    max-width: 480px;
    width: 100%;
    max-height: calc(100vh - 2 * var(--space-md));
    overflow-y: auto;
    box-shadow: var(--shadow-xl);
    z-index: var(--z-modal);
  }

  .modal h2 {
    margin-bottom: var(--space-md);
  }

  .modal p {
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
  }

  .modal-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-xl);
  }
</style>
