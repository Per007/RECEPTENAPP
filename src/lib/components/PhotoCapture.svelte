<script lang="ts">
  interface Props {
    onCapture?: (imageData: string) => void;
    maxSize?: number; // Max dimension in pixels
  }

  let { onCapture, maxSize = 800 }: Props = $props();

  let cameraInput: HTMLInputElement;
  let albumInput: HTMLInputElement;
  let isProcessing = $state(false);

  function handleCameraSelect() {
    cameraInput?.click();
  }

  function handleAlbumSelect() {
    albumInput?.click();
  }

  async function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    isProcessing = true;

    try {
      const imageData = await processImage(file);
      onCapture?.(imageData);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Fout bij het verwerken van de foto. Probeer het opnieuw.");
    } finally {
      isProcessing = false;
      // Reset input so same file can be selected again
      target.value = "";
    }
  }

  async function processImage(file: File): Promise<string> {
    console.log("Processing image:", file.name, file.type, file.size);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Resize if needed
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          // Important: Canvas dimensions must be integers
          canvas.width = Math.floor(width);
          canvas.height = Math.floor(height);

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to base64 with compression
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          console.log("Image processed successfully, length:", dataUrl.length);
          resolve(dataUrl);
        };

        img.onerror = (err) => {
          console.error("Image load error:", err);
          reject(new Error("Failed to load image"));
        };
        img.src = e.target?.result as string;
      };

      reader.onerror = (err) => {
        console.error("FileReader error:", err);
        reject(new Error("Failed to read file"));
      };
      reader.readAsDataURL(file);
    });
  }
</script>

<div class="photo-capture">
  <input
    bind:this={cameraInput}
    type="file"
    accept="image/*"
    capture="environment"
    class="file-input"
    onchange={handleFileChange}
    aria-label="Maak foto met camera"
  />

  <input
    bind:this={albumInput}
    type="file"
    accept="image/*"
    class="file-input"
    onchange={handleFileChange}
    aria-label="Kies foto uit album"
  />

  <div class="buttons-container">
    <button
      type="button"
      class="capture-btn"
      onclick={handleCameraSelect}
      disabled={isProcessing}
    >
      {#if isProcessing}
        <span class="loading">⏳</span>
        <span>Verwerken...</span>
      {:else}
        <span class="icon">📷</span>
        <span>Foto maken</span>
      {/if}
    </button>

    <button
      type="button"
      class="capture-btn secondary"
      onclick={handleAlbumSelect}
      disabled={isProcessing}
    >
      {#if isProcessing}
        <span class="loading">⏳</span>
        <span>Verwerken...</span>
      {:else}
        <span class="icon">🖼️</span>
        <span>Kies uit album</span>
      {/if}
    </button>
  </div>
</div>

<style>
  .photo-capture {
    width: 100%;
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

  .buttons-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }

  .capture-btn {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-lg);
    border: 3px dashed var(--color-border);
    border-radius: var(--border-radius-lg);
    background: var(--color-bg-card);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    min-height: 120px;
  }

  .capture-btn:hover:not(:disabled) {
    border-color: var(--color-primary);
    background: var(--color-bg-hover);
    color: var(--color-primary);
  }

  /* Secondary button style variations if needed, keeping them similar for now but could be distinct */
  .capture-btn.secondary {
    border-style: solid;
    border-width: 2px;
  }

  .capture-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .icon,
  .loading {
    font-size: 2.5rem;
  }

  .loading {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive for very small screens */
  @media (max-width: 400px) {
    .buttons-container {
      grid-template-columns: 1fr;
    }

    .capture-btn {
      min-height: 100px;
      flex-direction: row;
      padding: var(--space-md);
    }

    .icon,
    .loading {
      font-size: 1.5rem;
    }
  }
</style>
