<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { onMount } from "svelte";
  import {
    getRecipe,
    addRecipe,
    updateRecipe,
    deleteRecipe as dbDeleteRecipe,
  } from "$lib/db/database";
  import { toggleFavorite, deleteRecipe, recipes } from "$lib/stores/recipes";
  import {
    getCategoryLabel,
    getCategoryIcon,
    type Recipe,
  } from "$lib/db/types";
  import Button from "$lib/components/Button.svelte";

  let recipe = $state<Recipe | null>(null);
  let isLoading = $state(true);
  let showDeleteConfirm = $state(false);
  let isDeleting = $state(false);
  let isSharedPreview = $state(false);
  let isSaving = $state(false);

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
      await toggleFavorite(recipe.id);
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
      alert("Fout bij het verwijderen. Probeer het opnieuw.");
    } finally {
      isDeleting = false;
      showDeleteConfirm = false;
    }
  }

  async function handleSaveShared() {
    if (!recipe || !isSharedPreview) return;

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
      alert("Er ging iets mis bij het opslaan.");
    } finally {
      isSaving = false;
    }
  }

  // Auto-image fetching state removed
</script>

<svelte:head>
  <title>{recipe?.title || "Recept"} - Mijn Recepten</title>
</svelte:head>

<div class="page">
  {#if isLoading}
    <div class="loading container">
      <p>⏳ Recept laden...</p>
    </div>
  {:else if !recipe}
    <div class="not-found container">
      <div class="empty-icon">🔍</div>
      <h1>Recept niet gevonden</h1>
      <p>Dit recept bestaat niet of is verwijderd.</p>
      <Button onclick={() => goto(`${base}/recepten`)}>
        ← Terug naar recepten
      </Button>
    </div>
  {:else}
    <!-- Hero image -->
    {#if recipe.photos && recipe.photos.length > 0}
      <div class="hero-image">
        <img src={recipe.photos[0]} alt={recipe.title} />
        {#if !isSharedPreview}
          <button
            class="favorite-btn"
            class:is-favorite={recipe.isFavorite}
            onclick={handleToggleFavorite}
            aria-label={recipe.isFavorite
              ? "Verwijder uit favorieten"
              : "Voeg toe aan favorieten"}
          >
            {recipe.isFavorite ? "★" : "☆"}
          </button>
        {/if}
      </div>
    {/if}

    <div class="content container">
      {#if isSharedPreview}
        <div class="shared-banner">
          <span class="icon">👋</span>
          <div class="text">
            <strong>Gedeeld recept</strong>
            <p>Dit is een voorbeeld. Sla het op om het te bewaren.</p>
          </div>
        </div>
      {/if}

      <header class="recipe-header">
        <div class="category-badge">
          {getCategoryIcon(recipe.category)}
          {getCategoryLabel(recipe.category)}
        </div>
        <h1>{recipe.title}</h1>

        {#if recipe.cookTime || recipe.servings}
          <div class="meta">
            {#if recipe.servings}
              <span class="meta-item">👥 {recipe.servings} porties</span>
            {/if}

            {#if recipe.cookTime}
              <span class="meta-item">🍳 Bereiden: {recipe.cookTime} min</span>
            {/if}
          </div>
        {/if}
      </header>

      {#if !recipe.photos?.length && !isSharedPreview}
        <button
          class="favorite-btn-inline"
          class:is-favorite={recipe.isFavorite}
          onclick={handleToggleFavorite}
        >
          {recipe.isFavorite ? "★ Favoriet" : "☆ Voeg toe aan favorieten"}
        </button>
      {/if}

      {#if recipe.ingredients && recipe.ingredients.length > 0}
        <section class="section">
          <h2>🥘 Ingrediënten</h2>
          <ul class="ingredients-list">
            {#each recipe.ingredients as ingredient}
              <li>{ingredient}</li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if recipe.instructions}
        <section class="section">
          <h2>📝 Bereiding</h2>
          <div class="instructions">
            {recipe.instructions}
          </div>
        </section>
      {/if}

      {#if recipe.notes}
        <section class="section">
          <h2>💡 Notities</h2>
          <div class="notes">
            {recipe.notes}
          </div>
        </section>
      {/if}

      {#if recipe.sourceUrl}
        <section class="section">
          <h2>🔗 Bron</h2>
          <div class="source-content">
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="source-link"
            >
              {recipe.sourceUrl}
            </a>
          </div>
        </section>
      {/if}

      {#if recipe.photos && recipe.photos.length > 1}
        <section class="section">
          <h2>📷 Foto's</h2>
          <div class="photo-grid">
            {#each recipe.photos as photo, index}
              <img
                src={photo}
                alt="{recipe.title} foto {index + 1}"
                loading="lazy"
              />
            {/each}
          </div>
        </section>
      {/if}

      <div class="actions">
        {#if isSharedPreview}
          <Button
            variant="primary"
            onclick={handleSaveShared}
            disabled={isSaving}
          >
            {isSaving ? "⏳ Opslaan..." : "💾 Opslaan in mijn recepten"}
          </Button>
          <Button variant="secondary" onclick={() => goto(`${base}/recepten`)}>
            Annuleren
          </Button>
        {:else}
          <Button variant="secondary" onclick={shareViaWhatsApp}>
            💬 Delen via WhatsApp
          </Button>
          <Button
            variant="secondary"
            onclick={() => goto(`${base}/recepten/${recipe?.id}/bewerken`)}
          >
            ✏️ Bewerken
          </Button>
          <Button variant="danger" onclick={() => (showDeleteConfirm = true)}>
            🗑️ Verwijderen
          </Button>
        {/if}
      </div>
    </div>

    <!-- Delete confirmation dialog -->
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
            Weet u zeker dat u "{recipe.title}" wilt verwijderen? Dit kan niet
            ongedaan worden gemaakt.
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
    padding-bottom: var(--space-2xl);
  }

  .shared-banner {
    background: #e3f2fd;
    color: #0d47a1;
    padding: var(--space-md);
    border-radius: var(--border-radius-lg);
    margin-bottom: var(--space-xl);
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    border: 1px solid #bbdefb;
  }

  .shared-banner .icon {
    font-size: 1.5rem;
  }

  .shared-banner .text p {
    margin: 0;
    font-size: var(--font-size-sm);
    color: #1565c0;
  }

  .loading,
  .not-found {
    text-align: center;
    padding: var(--space-2xl) var(--content-padding);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: var(--space-lg);
  }

  /* Hero Image */
  .hero-image {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    max-height: 400px;
    overflow: hidden;
  }

  .hero-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .favorite-btn {
    position: absolute;
    top: var(--space-md);
    right: var(--space-md);
    width: 56px;
    height: 56px;
    border: none;
    border-radius: var(--border-radius-full);
    background: rgba(255, 255, 255, 0.95);
    font-size: 2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform var(--transition-fast);
    color: var(--color-text-muted);
    box-shadow: var(--shadow-md);
  }

  .favorite-btn:hover {
    transform: scale(1.1);
  }

  .favorite-btn.is-favorite {
    color: var(--color-favorite);
  }

  .favorite-btn-inline {
    display: block;
    width: 100%;
    padding: var(--space-md);
    margin-bottom: var(--space-lg);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--border-radius-md);
    background: var(--color-bg-card);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    color: var(--color-text-secondary);
  }

  .favorite-btn-inline:hover {
    border-color: var(--color-favorite);
    color: var(--color-favorite);
  }

  .favorite-btn-inline.is-favorite {
    color: var(--color-favorite);
    border-color: var(--color-favorite);
    background: #fff3e0;
  }

  /* Content */
  .content {
    padding: var(--space-lg) var(--content-padding);
  }

  .recipe-header {
    margin-bottom: var(--space-xl);
  }

  .category-badge {
    display: inline-block;
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--border-radius-full);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--space-md);
  }

  .recipe-header h1 {
    font-size: var(--font-size-2xl);
    margin-bottom: var(--space-md);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
  }

  .meta-item {
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
  }

  /* Sections */
  .section {
    background: var(--color-bg-card);
    padding: var(--space-lg);
    border-radius: var(--border-radius-lg);
    margin-bottom: var(--space-lg);
  }

  .section h2 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-md);
  }

  .ingredients-list {
    list-style: none;
    padding: 0;
  }

  .ingredients-list li {
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--color-border);
    font-size: var(--font-size-base);
  }

  .ingredients-list li:last-child {
    border-bottom: none;
  }

  .instructions {
    white-space: pre-wrap;
    line-height: var(--line-height-relaxed);
  }

  .notes {
    white-space: pre-wrap;
    color: var(--color-text-secondary);
  }

  .source-link {
    word-break: break-all;
    display: block;
    margin-bottom: var(--space-md);
  }

  .source-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  /* Preview image styles removed */
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-md);
  }

  .photo-grid img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: var(--border-radius-md);
  }

  /* Actions */
  .actions {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-xl);
    flex-wrap: wrap;
  }

  /* Modal */
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

  /* Responsive Actions */
  @media (max-width: 640px) {
    .actions {
      flex-direction: column !important;
    }

    /* Ensure buttons take full width if they don't automatically */
    .actions :global(button) {
      width: 100% !important;
    }
  }
</style>
