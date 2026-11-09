<script setup lang="ts">
// Modell-Check: Wie gut lagen die Böen der Modelle an den Stationen dieser Region in den letzten 14 Tagen?
// @ts-nocheck
import { levelIdx } from "#shared/engine";
const D = useDash();
// Gleiche Böe wie die Ampel: bis Fortgeschritten das stärkere Modell, ab Erfahren das Mittel
const key = computed(() => { void [D.S.level, D.S.levelBase]; D.sync(); return levelIdx() >= 2 ? "mean" : "strict"; });
const data = ref(null), error = ref(""), box = ref<HTMLElement | null>(null);
let io = null;
async function load() {
  error.value = "";
  try { data.value = await $fetch(`/api/verify/${D.R.id}`, { cache: "no-cache" }); }
  catch (e) { error.value = e?.data?.statusMessage || e.message; }
}
// Erst laden, wenn das Modul ins Bild kommt
onMounted(() => {
  io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: "200px" });
  if (box.value) io.observe(box.value);
});
onUnmounted(() => io?.disconnect());
const rows = computed(() => (data.value?.stations || []).filter(s => s.n > 0).map(s => {
  const k = key.value, days = s.days.map(d => ({ ...d, v: k === "mean" ? d.biasMean : d.bias }));
  const b = Math.round(s.bias[k]), maxAbs = Math.max(4, ...days.map(d => Math.abs(d.v ?? 0)));
  return { ...s, days, b, hitPct: Math.round(s.hit[k] * 100), miss: s.missed[k], tone: b >= 3 ? "high" : b <= -3 ? "low" : "ok", maxAbs };
}));
const summary = computed(() => {
  const r = rows.value; if (!r.length) return "";
  const hi = r.filter(x => x.tone === "high").length, lo = r.filter(x => x.tone === "low").length;
  const missed = r.reduce((s, x) => s + x.miss, 0), strong = r.reduce((s, x) => s + x.strong, 0);
  return `${hi} von ${r.length} Stationen: Modell zu stark, ${lo}: zu schwach. Starke Böen über 25 km/h verpasst: ${missed} von ${strong} Stunden.`;
});
</script>

<template>
  <section ref="box" class="card verify">
    <h2>Modell-Check <small>Böen, letzte {{ data?.days ?? 14 }} Tage, {{ data ? `${data.hours[0]}–${data.hours[1] + 1}` : "10–17" }} Uhr</small></h2>
    <div v-if="error" class="err">Modell-Check nicht verfügbar: {{ error }} <button type="button" class="btn" @click="load">Erneut laden</button></div>
    <div v-else-if="!data" class="hint">Lade Vergleich Modell gegen Messung…</div>
    <template v-else>
      <p class="verify-sum">{{ summary }}</p>
      <div class="verify-rows">
        <div v-for="s in rows" :key="s.id" class="verify-row">
          <div class="vr-name"><b>{{ s.name }}</b> <span class="mono">{{ s.elev }} m</span><small>{{ s.role }}</small></div>
          <div class="vr-bias" :class="s.tone" :title="`ICON-D2 ${s.bias.d2?.toFixed(1)} · ICON-CH2 ${s.bias.ch2?.toFixed(1)} km/h`">
            <b class="mono">{{ s.b > 0 ? "+" : "" }}{{ s.b }}</b> km/h
            <small>{{ s.tone === "high" ? "Modell zu stark" : s.tone === "low" ? "Modell zu schwach" : "passt" }}</small>
          </div>
          <div class="vr-hit"><b class="mono">{{ s.hitPct }} %</b><small>gleiche Stufe</small></div>
          <div class="vr-miss" :class="{ bad: s.miss > 0 }"><b class="mono">{{ s.miss }}/{{ s.strong }}</b><small>starke verpasst</small></div>
          <svg class="vr-spark" viewBox="0 0 140 30" preserveAspectRatio="none" :aria-label="`Tagesabweichung ${s.name}`">
            <line x1="0" y1="15" x2="140" y2="15" class="zero" />
            <rect v-for="(d, i) in s.days" :key="d.day" :x="i * (140 / s.days.length) + 1" :width="140 / s.days.length - 2"
              :y="d.v >= 0 ? 15 - 14 * d.v / s.maxAbs : 15" :height="Math.max(1, 14 * Math.abs(d.v) / s.maxAbs)"
              :class="d.v >= 0 ? 'pos' : 'neg'"><title>{{ d.day }}: {{ d.v > 0 ? "+" : "" }}{{ d.v.toFixed(1) }} km/h, gemessen max {{ Math.round(d.obsMax) }}</title></rect>
          </svg>
        </div>
      </div>
      <div class="hint">
        Verglichen wird die Böe, die die Ampel für dein Level nutzt ({{ key === "mean" ? "Mittel aus ICON-D2 und ICON-CH2" : "das stärkere von ICON-D2 und ICON-CH2" }}), mit der gemessenen Böe am Ort der Station.
        <b>Zu stark</b> heisst: Ampel eher zu streng. <b>Zu schwach</b> oder verpasste starke Böen heissen: Ampel dort zu freundlich, Vorsicht.
        Talstationen messen anders als Startplätze. „Gleiche Stufe“: bis 18, bis 25, über 25 km/h.
      </div>
    </template>
  </section>
</template>
