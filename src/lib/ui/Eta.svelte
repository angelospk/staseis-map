<script lang="ts">
  // An arrival time in the shared ETA style (docs/design-unify-2026-11.md, app.css .eta): a time from a vehicle's GPS
  // sits on the board plate (dark plate, amber digits, like a smart bus stop's LED board); a timetable time is a
  // muted number with no plate. The digits flip once when the number changes (a new GPS fix).
  import { fly } from "svelte/transition";
  let { text, live, xl = false }: { text: string; live: boolean; xl?: boolean } = $props();
  const now = $derived(text === "τώρα");
  const prime = $derived(text.endsWith("′"));
  const digits = $derived(prime ? text.slice(0, -1) : text);
  const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
</script>

<b class="eta" class:xl class:now class:sched={!live} class:plate={live}>{#if live}{#key text}<span class="digits" in:fly={{ y: still ? 0 : 8, duration: still ? 0 : 150 }}>{digits}{#if prime}<i class="min">′</i>{/if}</span>{/key}{:else}{text}{/if}</b>
