<script setup lang="ts">
// @ts-nocheck
import { mn, curDay, dayName, motto, buildBriefing } from "#shared/engine";
import { sceneSVG, compassSVG } from "#shared/svg";
import { LEVEL_TXT, lvClass, nowLocalKey, compassName, dayParts } from "#shared/format";
const D = useDash();
const sim = computed(() => D.S.mode === "sim");

const view = computed(() => {
  const EV = D.sync();
  const s = D.R.SITES.find(x => x.id === D.S.tab), ev = EV[s.id];
  if (!ev || !ev.days.length) return { s, empty: true };
  const nowKey = sim.value ? "" : nowLocalKey();
  const day = curDay();
  const nowHour = !sim.value && D.SEL.dayIdx === 0 ? ev.hours.find(h => h.t === nowLocalKey()) : null;
  const ref = (D.SEL.hour != null && day.hours.find(h => h.hour === D.SEL.hour)) || nowHour
    || (day.best && day.hours.find(h => h.hour === day.best.from)) || day.hours[Math.floor(day.hours.length / 2)];
  const future = day.hours.filter(h => h.t >= nowKey);
  const dayBest = mn(...future.map(h => h.score.level));
  const lvl = future.length ? dayBest : null;
  const title = future.length === 0 ? "vorbei" : dayBest == null ? "keine Daten" : LEVEL_TXT[dayBest];
  let sub = day.best ? `${day.best.level === 0 ? "Grünes" : "Gelbes"} Fenster <b class="mono">${day.best.from}–${day.best.to + 1} Uhr</b>` : "Kein Fenster an diesem Tag.";
  if (!sim.value) {
    const ng = ev.days.findIndex(d => d.best && d.best.level === 0);
    if (ng >= 0 && ng !== D.SEL.dayIdx) sub += ` · ${dayName(ng, ev.days[ng].key)} grün ${ev.days[ng].best.from}–${ev.days[ng].best.to + 1}`;
    else if (ng < 0) sub += ` · In ${ev.days.length} Tagen kein grünes Fenster.`;
  } else sub += ` · ${ev.days.filter(d => d.greenHours > 0).length} von ${ev.days.length} Tagen mit grünen Stunden`;
  const B = buildBriefing(s, ev, day);
  return {
    s, ev, day, ref, lvl, title, sub, nowKey,
    scene: sceneSVG(lvl, ref, s), compass: compassSVG(s, ref), motto: motto(lvl, day, future),
    dayLabel: dayName(D.SEL.dayIdx, day.key),
    brief: B && { ...B, head: B.head.charAt(0).toUpperCase() + B.head.slice(1) },
    cards: ev.days.map((d, i) => ({ i, d, p: dayParts(d.key), name: dayName(i, d.key).replace("Übermorgen", "Überm.") })),
  };
});
const calendar = computed(() => {
  const v = view.value; if (!v.ev || !sim.value) return null;
  const lead = dayParts(v.ev.days[0].key).dow;
  const top = v.ev.days.map((d, i) => ({ d, i, p: dayParts(d.key) })).filter(x => x.d.greenHours > 0).sort((a, b) => b.d.greenHours - a.d.greenHours).slice(0, 4);
  return { lead, top, days: v.ev.days.map((d, i) => ({ d, i, p: dayParts(d.key) })) };
});
function pickDay(i: number) { D.SEL.dayIdx = i; D.SEL.hour = null; }
const err = computed(() => sim.value ? D.DATA.errors.sim : D.DATA.errors.fc);
</script>

<template>
  <section class="hero" :class="{ sim }" aria-live="polite">
    <template v-if="view.empty">
      <div v-if="err" class="err">Daten nicht geladen: {{ err }}. Tippe auf Neu laden.</div>
      <div v-else class="muted">{{ sim ? `Lade Rückblick der letzten ${D.S.extra.simDays} Tage…` : "Lade Prognose…" }}</div>
    </template>
    <template v-else>
      <div class="scene-wrap">
        <div v-html="view.scene" />
        <div class="scene-txt">
          <div class="eyebrow"><b>{{ view.s.name }}</b> · {{ view.s.elev }} m · Start {{ view.s.sectorLabel }}<span v-if="sim" class="simtag">Rückblick</span></div>
          <div class="motto">{{ view.motto }}</div>
          <span class="pill" :class="lvClass(view.lvl)">{{ view.dayLabel }} · {{ view.title }}</span>
        </div>
      </div>
      <div class="hero-head">
        <div class="txt">
          <div class="verdict-sub" v-html="view.sub" />
          <div v-if="view.ref && view.ref.score.launch" class="hint"><b>Passender Start {{ view.ref.hour }} Uhr:</b> {{ view.ref.score.launch.name }} ({{ view.ref.score.launch.sectorLabel }})</div>
          <div class="hint">Windsack und Pfeil: Modellwind {{ view.ref ? view.ref.hour + " Uhr" : "" }}<template v-if="view.ref && view.ref.windLaunch != null">, {{ Math.round(view.ref.windLaunch) }} km/h aus {{ compassName(view.ref.dir ?? 0) }}</template></div>
        </div>
        <div v-html="view.compass" />
      </div>

      <template v-if="calendar">
        <div class="cal">
          <span v-for="w in ['Mo','Di','Mi','Do','Fr','Sa','So']" :key="w" class="wd">{{ w }}</span>
          <span v-for="n in calendar.lead" :key="'l' + n" />
          <button v-for="x in calendar.days" :key="x.d.key" :class="lvClass(x.d.bestLevel)" :aria-pressed="x.i === D.SEL.dayIdx"
            :aria-label="`${x.p.wd} ${x.p.dm}: ${x.d.bestLevel == null ? 'keine Daten' : LEVEL_TXT[x.d.bestLevel]}, ${x.d.greenHours} grüne Stunden`" @click="pickDay(x.i)">
            <b>{{ x.p.dnum }}</b><span class="gh">{{ x.d.greenHours ? x.d.greenHours + "h" : "·" }}</span>
          </button>
        </div>
        <div class="label">Beste Tage im Rückblick</div>
        <div class="toplist">
          <button v-for="x in calendar.top" :key="x.d.key" @click="pickDay(x.i)">{{ x.p.wd }} {{ x.p.dm }} · {{ x.d.greenHours }} h grün</button>
          <span v-if="!calendar.top.length" class="hint">Kein grüner Tag in diesem Zeitraum. Probier ein höheres Pilotenlevel.</span>
        </div>
      </template>
      <div v-else class="daycards">
        <button v-for="c in view.cards" :key="c.d.key" class="daycard" :aria-pressed="c.i === D.SEL.dayIdx" @click="pickDay(c.i)">
          <span class="dn">{{ c.name }}</span><span class="dd">{{ c.p.wd }} {{ c.p.dm }}</span>
          <span class="win" :class="c.d.best ? 'l' + c.d.best.level : 'l2'">{{ c.d.best ? `${c.d.best.from}–${c.d.best.to + 1} h` : "kein Fenster" }}</span>
          <span class="miniband"><i v-for="h in c.d.hours" :key="h.t" :class="[lvClass(h.score.level), { past: h.t < view.nowKey, lowconf: h.lowConf }]" /></span>
        </button>
      </div>

      <div v-if="view.brief" class="brief" :class="lvClass(view.brief.lv)">
        <div class="brief-head"><span class="label">Briefing · {{ view.dayLabel }}</span><span class="hint">{{ view.brief.src }}</span></div>
        <p>{{ view.brief.head }}</p>
        <dl>
          <dt>Fenster</dt><dd>{{ view.brief.fenster }}</dd>
          <template v-if="view.brief.achtung.length"><dt>Achtung</dt><dd>{{ view.brief.achtung.slice(0, 4).join(" · ") }}</dd></template>
          <template v-if="view.brief.thermik"><dt>Thermik</dt><dd>{{ view.brief.thermik }}</dd></template>
        </dl>
      </div>
      <div class="legend">
        <span><i style="background:var(--go);opacity:.6" />optimaler Sektor</span>
        <span v-if="view.s.sectorWide || view.s.launches"><i style="background:var(--warn);opacity:.5" />fliegbarer Sektor</span>
      </div>
    </template>
  </section>
</template>
