<script lang="ts" module>
  /** Cirkel als pad, zodat elk icoon uit alleen paden bestaat. */
  function circle(cx: number, cy: number, r: number): string {
    return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  }

  const ICONS = {
    home: ["M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"],
    book: ["M5 5a2 2 0 0 1 2-2h12v14H7a2 2 0 0 0-2 2z", "M5 19a2 2 0 0 0 2 2h12v-4", "M9 7h6"],
    plus: ["M12 5v14M5 12h14"],
    "plus-circle": [circle(12, 12, 9), "M12 8v8M8 12h8"],
    star: ["m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"],
    sliders: ["M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1", circle(15, 6, 2), circle(9, 12, 2), circle(17, 18, 2)],
    search: [circle(11, 11, 7), "m20 20-4-4"],
    clock: [circle(12, 12, 9), "M12 7v5l3.5 2"],
    users: [circle(9, 8, 3.5), "M2.5 20.5a6.5 6.5 0 0 1 13 0", "M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.5a6.5 6.5 0 0 1 3 6"],
    x: ["M6 6l12 12M18 6 6 18"],
    "arrow-left": ["M19 12H5M11 6l-6 6 6 6"],
    check: ["m5 12.5 4.5 4.5L19 7"],
    edit: ["M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z", "m14.5 7.5 3 3"],
    share: [circle(18, 5.5, 2.5), circle(6, 12, 2.5), circle(18, 18.5, 2.5), "m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"],
    trash: ["M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"],
    external: ["M14 4h6v6M20 4l-9 9", "M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"],
    globe: [circle(12, 12, 9), "M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"],
    zoom: [circle(11, 11, 7), "m20 20-4-4M11 8v6M8 11h6"],
    pot: ["M4 10h16v5.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15.5z", "M2 10h20M9.5 6.5c0-1 1-1.5 1-2.5M14 6.5c0-1 1-1.5 1-2.5"],
    list: ["M9 6h11M9 12h11M9 18h11", circle(4.5, 6, 1), circle(4.5, 12, 1), circle(4.5, 18, 1)],
  } satisfies Record<string, string[]>;

  export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
  interface Props {
    name: IconName;
    size?: number;
    /** Gevuld (bijv. een volle ster voor een favoriet). */
    filled?: boolean;
    strokeWidth?: number;
  }

  let { name, size = 24, filled = false, strokeWidth = 2 }: Props = $props();
</script>

<svg
  class="icon"
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={filled ? "currentColor" : "none"}
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  {#each ICONS[name] as d}
    <path {d} />
  {/each}
</svg>

<style>
  .icon {
    flex-shrink: 0;
    display: inline-block;
    vertical-align: middle;
  }
</style>
