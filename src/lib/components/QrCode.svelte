<script lang="ts">
  import QRCode from "qrcode";

  interface Props {
    text: string;
  }

  let { text }: Props = $props();
  let svg = $state("");

  $effect(() => {
    const current = text;
    QRCode.toString(current, { type: "svg", margin: 1 })
      .then((result) => {
        if (current === text) svg = result;
      })
      .catch((error) => {
        console.error("QR-code maken mislukt:", error);
        svg = "";
      });
  });
</script>

<!-- De SVG komt uit de qrcode-bibliotheek, niet uit invoer van de gebruiker. -->
<div
  class="qr"
  role="img"
  aria-label="QR-code om een ander apparaat te koppelen"
>
  {@html svg}
</div>

<style>
  .qr {
    width: 100%;
    max-width: 280px;
    min-width: 220px;
    aspect-ratio: 1;
    margin: 0 auto;
    padding: var(--space-sm);
    /* Altijd wit, ook in donkere modus: anders leest een camera de code niet. */
    background: #ffffff;
    border-radius: var(--border-radius-md);
  }

  .qr :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
