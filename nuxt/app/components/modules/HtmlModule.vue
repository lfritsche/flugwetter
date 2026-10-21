<script setup lang="ts">
// Generisches Darstellungs-Modul: rendert eine View-Funktion aus utils/views.ts
// @ts-nocheck
const props = defineProps<{ render: (s: any) => string }>();
const D = useDash();
const html = computed(() => {
  D.sync();
  // Abhängigkeiten für Reaktivität: Auswahl, Modus, Grenzwerte, Daten
  void [D.SEL.dayIdx, D.SEL.hour, D.S.mode, D.S.flight, D.S.level, D.DATA.live, D.DATA.fetchedAt];
  const s = D.R.SITES.find(x => x.id === D.S.tab);
  try { return props.render(s); } catch (e) { console.error(e); return `<div class="err">Modul-Fehler: ${e.message}</div>`; }
});
</script>

<template>
  <section class="card" v-html="html" />
</template>
