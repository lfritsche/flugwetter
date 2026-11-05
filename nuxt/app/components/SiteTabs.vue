<script setup lang="ts">
// @ts-nocheck
import { mn } from "#shared/engine";
import { LEVEL_TXT, nowLocalKey, dayParts } from "#shared/format";
const D = useDash();
const tabs = computed(() => {
  const EV = D.EVAL.value, sim = D.S.mode === "sim", nowKey = sim ? "" : nowLocalKey();
  return D.R.SITES.map(s => {
    const ev = EV[s.id];
    // Pro Tag die beste noch kommende Stunde. Vergangene Stunden zählen nicht. Im Rückblick zu viele Tage für den Streifen.
    const days = !ev || sim ? [] : ev.days.map(d => ({ key: d.key, wd: dayParts(d.key).wd, lv: mn(...d.hours.filter(h => h.t >= nowKey).map(h => h.score.level)) }));
    const text = days.map(d => `${d.wd}: ${d.lv == null ? "vorbei" : LEVEL_TXT[d.lv]}`).join(", ");
    return { s, days, text };
  });
});
function pick(id: string) { D.S.tab = id; D.SEL.hour = null; }
// Gewählte Karte ins Bild holen, ohne die Seite vertikal zu bewegen
const nav = ref<HTMLElement | null>(null);
function center() {
  const c = nav.value, el = c?.querySelector('[aria-selected="true"]');
  if (el) c.scrollTo({ left: el.offsetLeft - c.offsetLeft - (c.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
}
watch(() => D.S.tab, () => nextTick(center));
onMounted(center);
</script>

<template>
  <nav ref="nav" class="tabs" role="tablist" aria-label="Startplätze">
    <button v-for="t in tabs" :key="t.s.id" class="tab" role="tab" :aria-selected="t.s.id === D.S.tab"
      :aria-label="`${t.s.name}, ${t.s.area}, ${t.s.elev} m${t.text ? '. ' + t.text : ''}`" @click="pick(t.s.id)">
      <span class="tab-name">{{ t.s.name }}<em class="mono">{{ t.s.elev }} m</em></span>
      <small>{{ t.s.area }}</small>
      <span v-if="t.days.length" class="tab-days" aria-hidden="true">
        <span v-for="d in t.days" :key="d.key" :class="d.lv == null ? 'past' : 'l' + d.lv"><i />{{ d.wd }}</span>
      </span>
    </button>
  </nav>
</template>
