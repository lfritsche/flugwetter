<script setup lang="ts">
// @ts-nocheck
import { mn } from "#shared/engine";
import { LEVEL_TXT, nowLocalKey } from "#shared/format";
const D = useDash();
const tabs = computed(() => {
  const EV = D.EVAL.value, nowKey = D.S.mode === "sim" ? "" : nowLocalKey();
  return D.R.SITES.map(s => {
    const ev = EV[s.id];
    const best = ev ? mn(...ev.days.flatMap(d => d.hours.filter(h => h.t >= nowKey).map(h => h.score.level))) : null;
    return { s, best, dot: best == null ? "var(--nodata)" : ["var(--go)", "var(--warn)", "var(--stop)"][best] };
  });
});
function pick(id: string) { D.S.tab = id; D.SEL.hour = null; }
</script>

<template>
  <nav class="tabs" role="tablist" aria-label="Startplätze">
    <button v-for="t in tabs" :key="t.s.id" class="tab" role="tab" :aria-selected="t.s.id === D.S.tab"
      :title="`Beste Stunde im Zeitraum: ${t.best == null ? 'keine Daten' : LEVEL_TXT[t.best]}`" @click="pick(t.s.id)">
      <span class="dot" :style="{ background: t.dot }" />{{ t.s.name }} <small>{{ t.s.area }}</small>
    </button>
  </nav>
</template>
