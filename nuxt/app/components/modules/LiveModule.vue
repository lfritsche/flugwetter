<script setup lang="ts">
// Webcams (mit Zeitregler/Zeitraffer bei Archiv), Holfuy-Widgets, Messstationen
// @ts-nocheck
import { renderStations } from "~/utils/views";
import { localKey, dateStr } from "#shared/format";
const D = useDash();
const s = computed(() => D.R.SITES.find(x => x.id === D.S.tab));
const tick = ref(Math.floor(Date.now() / 300000));
let iv: any;
onMounted(() => { iv = setInterval(() => tick.value = Math.floor(Date.now() / 300000), 60000); });
onUnmounted(() => clearInterval(iv));
const camURL = (u: string) => u + (u.includes("?") ? "&" : "?") + "t=" + tick.value;

// ---- Zeitregler je Kamera
const tl = reactive<Record<number, { day: number; idx: number; url: string | null; label: string; playing: boolean }>>({});
watch(s, () => { Object.keys(tl).forEach(k => delete tl[k]); }, { immediate: true });
function slots(arch, dayOffset) {
  const d = new Date(Date.now() - dayOffset * 864e5), date = dateStr(d), out = [];
  const nowKey = localKey(new Date()), nowMin = +nowKey.slice(11, 13) * 60 + new Date().getMinutes();
  for (let m = arch.from * 60; m <= arch.to * 60; m += 10) {
    if (dayOffset === 0 && m > nowMin - 12) break;   // jüngstes Archivbild hängt ca. 10 min nach
    out.push({ date, h: Math.floor(m / 60), m: m % 60 });
  }
  return out;
}
function archiveImg(arch, slot): Promise<string | null> {
  const pad = n => String(n).padStart(2, "0");
  const tries = arch.type === "fotowebcam"
    ? [`https://www.foto-webcam.eu/webcam/${arch.id}/${slot.date.replace(/-/g, "/")}/${pad(slot.h)}${pad(slot.m)}_la.jpg`]
    : [1, 2, 0, 3].map(o => `${arch.base}${slot.date}_${pad(slot.h)}:${pad(slot.m + o)}.jpg`);
  return new Promise(res => {
    const next = i => { if (i >= tries.length) return res(null); const im = new Image(); im.onload = () => res(tries[i]); im.onerror = () => next(i + 1); im.src = tries[i]; };
    next(0);
  });
}
const state = (i: number) => tl[i] ||= { day: 0, idx: slots(s.value.cams[i].archive, 0).length, url: null, label: "Live", playing: false };
let seq = 0;
async function show(i: number) {
  const st = state(i), cam = s.value.cams[i], sl = slots(cam.archive, st.day), my = ++seq;
  if (st.day === 0 && st.idx >= sl.length) { st.url = null; st.label = "Live"; return; }
  const slot = sl[Math.min(st.idx, sl.length - 1)]; if (!slot) return;
  st.label = `${slot.h}:${String(slot.m).padStart(2, "0")}`;
  const url = await archiveImg(cam.archive, slot);
  if (my === seq) st.url = url || "none";
}
function setDay(i: number, day: number) {
  const st = state(i); st.playing = false; st.day = day;
  const n = slots(s.value.cams[i].archive, day).length;
  st.idx = day === 1 ? Math.floor(n / 2) : n; show(i);
}
async function play(i: number) {
  const st = state(i);
  if (st.playing) { st.playing = false; return; }
  const n = slots(s.value.cams[i].archive, st.day).length, last = n - (st.day === 0 ? 0 : 1);
  if (st.idx >= last) st.idx = 0;
  st.playing = true;
  while (st.playing && st.idx < last) { st.idx++; await show(i); await new Promise(r => setTimeout(r, 350)); }
  st.playing = false;
}
const stations = computed(() => { D.sync(); void [D.DATA.live, D.S.level]; return renderStations(); });
const more = computed(() => {
  const x = s.value;
  if (x.holfuy?.length) return { u: `https://holfuy.com/de/weather/${x.holfuy[0].id}`, t: "Holfuy öffnen" };
  return x.liveLink ? { u: x.liveLink.u, t: x.liveLink.t } : null;
});
</script>

<template>
  <section class="card">
    <h2>Live am Start <small><a v-if="more" :href="more.u" target="_blank" rel="noopener">{{ more.t }}</a></small></h2>
    <div v-if="D.S.mode === 'sim'" class="flag sim">Rückblick aktiv: Webcams und Messwerte zeigen trotzdem jetzt.</div>
    <div class="cams" :class="{ single: s.cams.length === 1 }">
      <a v-for="(c, i) in s.cams" :key="c.img" class="cam" :href="c.link" target="_blank" rel="noopener">
        <img :src="tl[i]?.url && tl[i].url !== 'none' ? tl[i].url : camURL(c.img)" :alt="`Webcam ${c.label}`" loading="lazy">
        <span>{{ c.label }}</span>
        <span v-if="tl[i] && tl[i].label !== 'Live'" class="tlbadge">{{ tl[i].url === "none" ? "kein Bild " : (tl[i].day ? "Gestern " : "") }}{{ tl[i].label }}</span>
      </a>
    </div>
    <template v-for="(c, i) in s.cams" :key="'tl' + c.img">
      <div v-if="c.archive" class="camtl">
        <div class="seg" role="group" aria-label="Tag">
          <button type="button" :aria-pressed="state(i).day === 0" @click="setDay(i, 0)">Heute</button>
          <button type="button" :aria-pressed="state(i).day === 1" @click="setDay(i, 1)">Gestern</button>
        </div>
        <button type="button" class="playbtn" :aria-label="state(i).playing ? 'Zeitraffer anhalten' : 'Zeitraffer abspielen'" @click="play(i)">
          <svg viewBox="0 0 16 16"><path v-if="state(i).playing" d="M4 2 H7 V14 H4 Z M9 2 H12 V14 H9 Z" /><path v-else d="M4 2 L14 8 L4 14 Z" /></svg>
        </button>
        <input type="range" :aria-label="`Webcam-Zeit ${c.label}`" min="0" :max="slots(c.archive, state(i).day).length" :value="state(i).idx"
          @input="state(i).playing = false; state(i).idx = +($event.target as HTMLInputElement).value; show(i)">
        <span class="tltime">{{ state(i).label }}</span>
      </div>
    </template>
    <template v-for="h in s.holfuy || []" :key="h.id">
      <div class="label">Holfuy {{ h.label }} · heute, 15-min-Werte</div>
      <iframe class="holfuy-frame" :title="`Holfuy ${h.label}`" loading="lazy" :src="`https://widget.holfuy.com/?station=${h.id}&su=km/h&t=C&lang=de&mode=average&avgrows=32`" />
    </template>
    <div v-html="stations" />
  </section>
</template>
