<script lang="ts">
    import { onMount } from "svelte";
    import { fade, scale } from "svelte/transition";

    interface Props {
        src: string;
        alt: string;
        onclose: () => void;
    }

    let { src, alt, onclose }: Props = $props();

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            onclose();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onclose} transition:fade={{ duration: 200 }}>
    <div
        class="modal"
        onclick={(e) => e.stopPropagation()}
        transition:scale={{ start: 0.9, duration: 200 }}
    >
        <button class="close-btn" onclick={onclose} aria-label="Sluiten">
            ✕
        </button>
        <img {src} {alt} />
    </div>
</div>

<style>
    .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000; /* High z-index to sit on top of everything */
        padding: var(--space-md);
    }

    .modal {
        position: relative;
        max-width: 100%;
        max-height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    img {
        max-width: 100%;
        max-height: 90vh;
        object-fit: contain;
        border-radius: var(--border-radius-sm);
        box-shadow: var(--shadow-xl);
    }

    .close-btn {
        position: absolute;
        top: -40px;
        right: 0;
        background: transparent;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        padding: var(--space-xs);
        line-height: 1;
        z-index: 10;
        transition: transform 0.2s;
    }

    .close-btn:hover {
        transform: scale(1.1);
    }

    @media (max-width: 640px) {
        .close-btn {
            top: var(--space-xs);
            right: var(--space-xs);
            background: rgba(0, 0, 0, 0.5);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }
    }
</style>
