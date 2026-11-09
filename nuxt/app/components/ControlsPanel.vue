<script setup lang="ts">
// @ts-nocheck
import { LEVELS, LEVEL_SLUGS, MODES, FLIGHTS, XC } from "#shared/config";
const D = useDash();
const S = D.S;
const custom = computed(() => S.level === "custom");
const idx = computed(() => custom.value ? S.levelBase : S.level);
const L = computed(() => LEVELS[idx.value]);
const F = D.R.foehn;
const lvlIdx = computed(() => idx.value);
const emit = defineEmits<{ settings: [] }>();
// Adresse teilen: nur dieser Link trägt das Level, die normale Adresse nicht
const copied = ref(false);
async function shareLevel() {
  try {
    await navigator.clipboard.writeText(`${location.origin}${location.pathname}?level=${LEVEL_SLUGS[idx.value]}`);
    copied.value = true; setTimeout(() => { copied.value = false; }, 2000);
  } catch {}
}
const open = ref(false), root = ref<HTMLElement | null>(null);
const summary = computed(() => [custom.value ? "Eigene Werte" : L.value.name, FLIGHTS[S.flight].short, MODES[S.mode].label.replace("Live ", "")]);
const onDown = e => { if (open.value && !root.value?.contains(e.target)) open.value = false; };
const onKey = e => { if (e.key === "Escape") open.value = false; };
onMounted(() => { document.addEventListener("pointerdown", onDown); document.addEventListener("keydown", onKey); });
onUnmounted(() => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); });
</script>

<template>
  <section ref="root" class="controls">
    <button type="button" class="ctl-chip" :class="{ sim: S.mode === 'sim' }" :aria-expanded="open" aria-controls="ctl-panel" aria-label="Einstellungen" @click="open = !open">
      <svg class="ctl-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
      <span class="ctl-sum"><template v-for="(x, i) in summary" :key="i"><i v-if="i">·</i><b v-if="!i">{{ x }}</b><template v-else>{{ x }}</template></template></span>
      <svg class="ctl-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4 L6 8.5 L10 4" /></svg>
    </button>
    <div v-show="open" id="ctl-panel" class="ctl-panel">
    <div class="seg" role="group" aria-label="Ansicht">
      <button v-for="(m, k) in MODES" :key="k" type="button" :data-mode="k" :aria-pressed="S.mode === k" @click="D.setMode(k)">{{ m.label }}</button>
    </div>
    <div class="seg two" role="group" aria-label="Flugart">
      <button v-for="(f, k) in FLIGHTS" :key="k" type="button" :data-flight="k" :aria-pressed="S.flight === k" @click="S.flight = k">{{ f.label }}</button>
    </div>
    <div>
      <div class="level-top">
        <span class="label">Pilotenlevel</span>
        <b>{{ custom ? "Eigene Werte" : L.name }}<small v-if="custom">basiert auf {{ L.name }}</small></b>
      </div>
      <input type="range" min="0" max="3" step="1" :value="idx" aria-label="Pilotenlevel" :aria-valuetext="L.name" @input="D.setLevel(+($event.target as HTMLInputElement).value)">
      <div class="level-ticks"><span v-for="(l, i) in LEVELS" :key="i" :class="{ on: i === idx }">{{ l.name }}</span></div>
    </div>
    <details class="explain">
      <summary>Welche Werte gelten gerade?</summary>
      <div class="explain-body">
        <div>{{ custom ? "Du hast Grenzwerte in den Einstellungen angepasst." : L.desc }}</div>
        <table class="lim-table">
          <thead><tr><th>Messgröße</th><th>grün bis</th><th>rot über</th></tr></thead>
          <tbody>
            <tr v-for="p in D.PARAMS" :key="p.key">
              <td>{{ p.label }}{{ p.invert ? " ↓" : "" }}</td>
              <td class="g">{{ p.invert ? "≥ " : "" }}{{ S.limits[p.key].g }}{{ p.unit ? " " + p.unit : "" }}</td>
              <td class="r">{{ p.invert ? "< " : "" }}{{ S.limits[p.key].r }}{{ p.unit ? " " + p.unit : "" }}</td>
            </tr>
          </tbody>
        </table>
        <ul class="rules">
          <li><b>Rot</b>, sobald ein einziger Wert rot ist, die Windrichtung nicht passt, es dunkel ist oder Bahn/Startplatz zu sind.</li>
          <li><b>Grün</b> nur, wenn Wind, Böen, Föhn und Richtung grün sind und die gelben Werte insgesamt wenig wiegen (gewichteter Score unter 15 %).</li>
          <li><b>Anfänger/Fortgeschrittene:</b> grün nur, wenn kein sicherheitsrelevanter Wert gelb ist (Wind, Böen, Föhn, Gewitter, Regen, Basis, Sicht, Lee, Front).</li>
          <li><b>Sonst gelb.</b> Sind ICON-D2 und ICON-CH2 bei den Böen mehr als {{ S.extra.modelSpread }} km/h uneinig, wird die Stunde eine Stufe schlechter.</li>
          <li><b>Flugart {{ FLIGHTS[S.flight].short }}:</b>
            <template v-if="S.flight === 'hf'">Höhenwind 700 hPa (ca. 3000 m) zählt bei Starts unter 1800 m höchstens gelb, weil du in Geländenähe darunter fliegst. Bei höheren Starts voll. Starke Thermik zählt höchstens gelb.</template>
            <template v-else>Höhenwind 700 hPa kann rot machen. Thermik erwünscht: Grenzschicht ab {{ XC.blhGood }} m und Basis ab {{ XC.baseGood }} m über Start sind grün, darunter gelb („kaum Thermik“).</template>
          </li>
          <li><b>Lee:</b> Kommt der Höhenwind (1500 m, bei Starts ab 1800 m 3000 m) von hinten, wird es gelb ab {{ 10 + 5 * lvlIdx }} km/h und rot ab {{ 20 + 5 * lvlIdx }} km/h.</li>
          <li><b>Nebel am Landeplatz:</b> rot bei Sicht unter 1,5 km oder Nebelmeldung, gelb unter 5 km oder bei tiefen Wolken nahe am Taupunkt. Gilt für alle Level. Das Modell kann Nebel falsch verorten: Webcam und Nebel-Check prüfen.</li>
          <li><b>Puffer:</b> Eine Stunde vor Gewitter, Regen, Föhn oder Front ist es nicht mehr grün. Außerdem zählen Sicht, Gewitter im Modell und Druckanstieg (Front).</li>
          <li><b>Messung schlägt Modell:</b> Für vergangene Stunden und jetzt zählen Wind und Richtung der zugeordneten Messstation am Start (z. B. Pfinnalm für die Spielalm). Talstationen ersetzen nur den Landewind.</li>
          <li><b>Modell-Check:</b> Lag das Modell ab 10 Uhr mehrfach daneben, steht ein Fragezeichen am Pfeil. Eine optimistische Richtung zählt dann nur noch gelb, nichts wird dadurch freundlicher.</li>
          <li><b>Böigkeit</b> zählt erst, wenn die Böen über {{ S.limits.gust.g }} km/h liegen.</li>
          <li><b>Richtung:</b> optimaler Sektor grün, fliegbarer Sektor gelb, sonst rot. Unter {{ S.extra.calmWind }} km/h zählt die Richtung nicht. Bei mehreren Startplätzen gilt der passendste.</li>
          <li><b>Föhn:</b> {{ F.combine === "max" ? `das Maximum aus ${F.primary.label} und ${F.secondary.label}` : `Druckdifferenz ${F.primary.label}` }}. Rot auch schon bei wenig Druck (ab 1 hPa, beim Anfänger), wenn der Höhenwind auf 3000 m von der Föhnseite ab 25 km/h kommt, oder bei steigendem Druck ab 3 hPa. Gemessener Föhn macht rot bis 3 Stunden nach der letzten Messung, danach für Anfänger gelb bis Tagesende. {{ F.explain }} Grün heißt nur: kein Föhnsignal im Modell.</li>
          <li>Pro Wert zählt das schlechtere Modell von ICON-D2 und ICON-CH2, bei den Böen ab Erfahren der Mittelwert beider (weniger falscher Alarm, aber mehr übersehene starke Böen). Wo ICON-D2 fehlt (ab ca. Tag 3, im 7-Tage-Modus ICON-EU/ECMWF), sind Stunden schraffiert.</li>
          <li><b>Rückblick:</b> echte vergangene Modellläufe (Open-Meteo Historical Forecast), bewertet mit deinen aktuellen Grenzwerten.</li>
        </ul>
      </div>
    </details>
    <div class="btn-row">
      <button v-if="!custom" type="button" class="btn" @click="shareLevel">{{ copied ? "Link kopiert" : "Link mit diesem Level kopieren" }}</button>
      <button type="button" class="btn" @click="open = false; emit('settings')">Weitere Einstellungen</button>
    </div>
    </div>
  </section>
</template>
