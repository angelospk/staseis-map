<script lang="ts">
  // A bus line's chip in its colours: the number on the line's colour. No operator mark (the app is unofficial).
  let { label, bg, fg }: { label: string; bg: string; fg: string } = $props();
</script>

<b class="chip" style:--bg={bg} style:--fg={fg}>{label}</b>

<style>
  /* The shared line badge (docs/design-unify-2026-11.md): radius 8, min 44 × 30, 14 / 800. */
  .chip { flex: none; display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 44px; height: 30px; padding: 0 8px;
    border-radius: var(--r-sm); background: var(--bg); color: var(--fg); font-size: var(--fs-badge); font-weight: 800; line-height: 1.15;
    font-variant-numeric: tabular-nums; box-sizing: border-box; }
</style>
