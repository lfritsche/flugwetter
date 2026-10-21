<script setup lang="ts">
const D = useDash();
const stamp = computed(() => {
  if (D.simLoading.value) return "Lade Rückblick…";
  if (!D.DATA.fetchedAt) return "Lade Prognose…";
  const errs = Object.keys(D.DATA.errors).length;
  return `Stand ${new Date(D.DATA.fetchedAt).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr`
    + (D.DATA.burnair ? " · mit Burnair" : "") + (errs ? " · teilweise Fehler" + (D.DATA.errors.burnair ? ` (Burnair: ${D.DATA.errors.burnair})` : "") : "");
});
const emit = defineEmits<{ settings: [] }>();
</script>

<template>
  <header class="top">
    <svg class="logo" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="23" style="fill:var(--surface);stroke:var(--line)" />
      <path d="M4 36 L15 22 L21 29 L29 17 L44 36 Z" style="fill:var(--muted);opacity:.55" />
      <path d="M11 15 Q24 4 37 15 Q24 10 11 15 Z" style="fill:var(--accent)" />
      <path d="M12 15 L24 27 M19 12.5 L24 27 M29 12.5 L24 27 M36 15 L24 27" style="stroke:var(--ink);stroke-width:.7;fill:none" />
      <circle cx="24" cy="28.5" r="2" style="fill:var(--ink)" />
    </svg>
    <div>
      <h1>Flugwetter <span>{{ D.R.areaName }}</span></h1>
      <div class="sub">{{ stamp }}</div>
    </div>
    <div class="spacer" />
    <button class="iconbtn" :class="{ spin: D.loading.value || D.simLoading.value }" aria-label="Neu laden" @click="D.refresh()">
      <svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></svg>
    </button>
    <button class="iconbtn" aria-label="Einstellungen" @click="emit('settings')">
      <svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
    </button>
  </header>
</template>
