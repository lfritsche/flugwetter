<script setup lang="ts">
// Schmale Leiste, die beim Scrollen stehen bleibt: Region, aktive Einstellungen, Stand
const D = useDash();
const regions = ref();
const stamp = computed(() => {
  if (D.simLoading.value) return "Lade Rückblick…";
  if (!D.DATA.fetchedAt) return "Lade Prognose…";
  const errs = Object.keys(D.DATA.errors).length;
  return `Stand ${new Date(D.DATA.fetchedAt).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}` + (errs ? " · teilweise Fehler" : "");
});
const stampLong = computed(() => stamp.value + (D.DATA.errors.burnair ? ` (Burnair: ${D.DATA.errors.burnair})` : ""));
const emit = defineEmits<{ settings: [] }>();
</script>

<template>
  <header class="deck">
    <svg class="logo" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="23" style="fill:var(--surface);stroke:var(--line)" />
      <path d="M4 36 L15 22 L21 29 L29 17 L44 36 Z" style="fill:var(--muted);opacity:.55" />
      <path d="M11 15 Q24 4 37 15 Q24 10 11 15 Z" style="fill:var(--accent)" />
      <path d="M12 15 L24 27 M19 12.5 L24 27 M29 12.5 L24 27 M36 15 L24 27" style="stroke:var(--ink);stroke-width:.7;fill:none" />
      <circle cx="24" cy="28.5" r="2" style="fill:var(--ink)" />
    </svg>
    <h1 class="deck-title">
      <button type="button" aria-haspopup="dialog" :aria-label="`Flugwetter ${D.R.areaName}, Region wechseln`" @click="regions?.open()">
        <small>Flugwetter</small>
        <span>{{ D.R.areaName }}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4 L6 8.5 L10 4" /></svg></span>
      </button>
    </h1>
    <ControlsPanel @settings="emit('settings')" />
    <div class="deck-right">
      <span class="deck-stamp" :title="stampLong">{{ stamp }}</span>
      <button class="iconbtn" :class="{ spin: D.loading.value || D.simLoading.value }" aria-label="Neu laden" @click="D.refresh()">
        <svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></svg>
      </button>
    </div>
    <RegionSwitch ref="regions" />
  </header>
</template>
