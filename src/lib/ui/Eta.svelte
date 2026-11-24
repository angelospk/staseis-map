<script lang="ts">
  // An arrival time in the shared ETA style (docs/design-unify-2026-11.md, app.css .eta): the live mark on a time from
  // a vehicle's GPS, a muted number from the timetable, «τώρα» smaller in the accent.
  import Icon from "./Icon.svelte";
  let { text, live, xl = false }: { text: string; live: boolean; xl?: boolean } = $props();
</script>

<b class="eta" class:xl class:now={text === "τώρα"} class:sched={!live}>{#if live}<span class="live" title="Ζωντανά, από το GPS"><Icon name="live" size={xl ? 13 : 11} /></span>{/if}{text}</b>
