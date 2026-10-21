<script setup lang="ts">
// @ts-nocheck
import { curDay, dayName, STATION_NAME } from "#shared/engine";
import { arrowSVG, dirColor } from "#shared/svg";
import { LEVEL_TXT, lvClass, nowLocalKey, dayParts, compassName } from "#shared/format";
const D = useDash();
const ROWS = [
  { k: "dir", label: "Richtung" },
  { k: "windLaunch", label: "Wind", f: v => Math.round(v) },
  { k: "gust", label: "Böen", f: v => Math.round(v) },
  { k: "windLand", label: "Landung", f: v => Math.round(v) },
  { k: "w850", label: "850 hPa", f: v => Math.round(v) },
  { k: "cloud", label: "Basis km", f: v => v > 4000 ? "hoch" : (v / 1000).toLocaleString("de-AT", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) },
  { k: "cape", label: "CAPE", f: v => v >= 1000 ? (v / 1000).toFixed(1) + "k" : Math.round(v) },
  { k: "rain", label: "Regen", f: v => v < 0.05 ? "·" : v.toLocaleString("de-AT", { maximumFractionDigits: 1 }) },
  { k: "foehn", label: "Föhn hPa", f: v => v.toLocaleString("de-AT", { maximumFractionDigits: 1 }) },
];
const view = computed(() => {
  const EV = D.sync();
  const s = D.R.SITES.find(x => x.id === D.S.tab), ev = EV[s.id];
  if (!ev || !ev.days.length) return null;
  const day = curDay(), sim = D.S.mode === "sim";
  return { s, day, p: dayParts(day.key), name: dayName(D.SEL.dayIdx, day.key), nowKey: sim ? "" : nowLocalKey(), sim };
});
const sel = computed(() => view.value && D.SEL.hour != null ? view.value.day.hours.find(h => h.hour === D.SEL.hour) : null);
function cellCls(h, extra = "") { return ["c", extra, { past: h.t < view.value.nowKey, sel: D.SEL.hour === h.hour }]; }
function cellVal(h, r) {
  if (r.k === "dir") return arrowSVG(h.dir, dirColor(h.score.dirGrade));
  const v = h[r.k]; return v == null ? "–" : String(r.f(v));
}
function cellTone(h, r) {
  if (r.k === "dir") return h.measured ? "meas" : h.dirSuspect ? "suspect" : h.burnair ? "ba" : "";
  const g = h.score.grades[r.k]; return g == null ? "" : "t" + g;
}
function toggle(hr: number) { D.SEL.hour = D.SEL.hour === hr ? null : hr; }
const notes = computed(() => {
  const h = sel.value; if (!h) return [];
  const out = [], sc = h.score;
  if (sc.bumped) out.push(`Modelle uneinig bei Böen (${Math.round(h.modelGustDiff)} km/h): eine Stufe schlechter.`);
  if (h.burnair) out.push(`Wind, Böen, Basis, Thermik und Regen aus Burnair (${h.burnair.toUpperCase()})${h.baBelow ? ", Start liegt unter dem Modellgelände: unterste Modellschicht" : ", Wind auf Starthöhe"}.`);
  if (h.dirSuspect) out.push(`Modell-Check: Die Windrichtung des Modells lag heute in ${h.dirSuspect} daneben (Vergleich mit ${STATION_NAME[view.value.s.measureStation] || "Messung"}). Vor Ort Windsack und Burnair prüfen.`);
  if (h.measured && h.model) out.push(`Wind gemessen in ${h.measured}. Modell hätte ${h.model.dir != null ? compassName(h.model.dir) : "–"} ${h.model.windLaunch != null ? Math.round(h.model.windLaunch) : "–"} km/h gesagt.`);
  if (h.landMeasured) out.push(`Landewind gemessen in ${h.landMeasured}.`);
  if (h.lowConf) out.push("Ohne ICON-D2: Wind aus ICON-CH2 bzw. ICON-EU/ECMWF, Höhenwind aus gröberen Modellen.");
  return out;
});
</script>

<template>
  <section class="card">
    <template v-if="!view"><h2>Stunden</h2><div class="muted">Lade…</div></template>
    <template v-else>
      <h2>{{ view.name }}<template v-if="!view.sim">, {{ view.p.wd }} {{ view.p.dm }}</template> <small>Spalte antippen für Gründe</small></h2>
      <div class="table-scroll">
        <div class="htable" :style="{ '--cols': view.day.hours.length }">
          <div class="rh" />
          <div v-for="h in view.day.hours" :key="'h' + h.t" class="hh" :class="{ now: h.t === nowLocalKey() && !view.sim }">{{ h.hour }}</div>
          <div class="rh">Ampel</div>
          <button v-for="h in view.day.hours" :key="'a' + h.t" :class="cellCls(h, `amp ${lvClass(h.score.level)}${h.lowConf ? ' lowconf' : ''}`)" :aria-label="`${h.hour} Uhr`" @click="toggle(h.hour)" />
          <template v-if="view.s.launches">
            <div class="rh">Start</div>
            <button v-for="h in view.day.hours" :key="'s' + h.t" :class="cellCls(h, h.score.dirGrade == null || h.score.dirGrade < 0 ? '' : 't' + h.score.dirGrade)" @click="toggle(h.hour)">{{ h.score.launch ? h.score.launch.short : "–" }}</button>
          </template>
          <template v-for="r in ROWS" :key="r.k">
            <div class="rh">{{ r.label }}</div>
            <button v-for="h in view.day.hours" :key="r.k + h.t" :class="cellCls(h, cellTone(h, r))" :aria-label="`${h.hour} Uhr`" @click="toggle(h.hour)" v-html="cellVal(h, r)" />
          </template>
        </div>
      </div>
      <div class="legend">
        <span>Wind, Böen, 850 hPa in km/h</span><span>Basis = Wolkenbasis über Start, – = wolkenlos</span>
        <span v-if="view.s.measureStation">• = gemessen ({{ STATION_NAME[view.s.measureStation] }})</span>
        <span v-if="D.DATA.burnair"><b style="color:var(--sim)">b</b> = Burnair</span>
        <span><i style="background:repeating-linear-gradient(135deg,var(--warn) 0 3px,var(--surface) 3px 5px)" />unsicher</span>
      </div>
      <div v-if="sel" class="detail">
        <div class="detail-head"><b>{{ sel.hour }}:00 Uhr</b><span class="pill" :class="lvClass(sel.score.level)">{{ sel.score.level == null ? "keine Daten" : LEVEL_TXT[sel.score.level] }}</span></div>
        <div>
          <div v-for="(r, i) in sel.score.reasons" :key="i" class="row">
            <span class="st" :class="lvClass(r.level)" /><span>{{ r.label }}</span><span class="v">{{ r.value ?? "–" }}</span><span class="lim">{{ r.limText }}</span>
          </div>
        </div>
        <div v-for="(t, i) in notes" :key="'n' + i" class="hint">{{ t }}</div>
      </div>
    </template>
  </section>
</template>
