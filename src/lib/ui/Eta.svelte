<script lang="ts">
  // An arrival time in the shared ETA style (docs/design-unify-2026-11.md, app.css .eta): a time from a vehicle's GPS
  // sits on the board plate (dark plate, amber digits, like a smart bus stop's LED board); a timetable time is a
  // muted number with no plate. The digits flip once when the number changes (a new GPS fix).
  import { fly } from "svelte/transition";
  import { prefersReducedMotion } from "svelte/motion";
  let { text, live, xl = false }: { text: string; live: boolean; xl?: boolean } = $props();
  const now = $derived(text === "τώρα");
  const prime = $derived(text.endsWith("′"));
  const digits = $derived(prime ? text.slice(0, -1) : text);
</script>

<b class="eta" class:xl class:now class:sched={!live} class:plate={live}>{#if live}<span class="sr">ζωντανά, από το GPS: </span>{#key text}<span class="digits" in:fly={{ y: prefersReducedMotion.current ? 0 : 8, duration: prefersReducedMotion.current ? 0 : 150 }}>{digits}{#if prime}<i class="min">′</i>{/if}</span>{/key}{:else}{text}{/if}</b>

<style>
  .sr { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
