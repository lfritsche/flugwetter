<script setup lang="ts">
// 3D-Gelände (MapLibre + Mapterhorn). Zeitregler, Startsektoren, Gleitpfad, Messstationen; am Desktop zusätzlich
// Nebel/Wolken, Leitungen, Sperrzonen und Windfeld. Gleitpfad und Windfeld sind nur grobe Orientierung.
// @ts-nocheck
import { profileHour, curDay, sectorGrade, landFogGrade } from "#shared/engine";
import { fanPolygon, glidePath, distM, fogTopFrom, reliefColor, gridAt } from "#shared/mapgeo";
import { LEVEL_TXT, compassName } from "#shared/format";
const MAPLIBRE_JS = "https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.css";
const EXAG = 1.4, STORE = "flugwetter.karte.v1";
const D = useDash();
const { isDesktop } = useDevice();
const box = ref<HTMLElement | null>(null), canvas = ref<HTMLCanvasElement | null>(null);
const status = ref("idle"), error = ref(""), glide = ref(null), playing = ref(false);
const hasZones = !!D.R.zones;

// Ebenen: mobil nur die leichten, "Alle Ebenen" schaltet den Rest frei
const reduced = import.meta.client && matchMedia("(prefers-reduced-motion: reduce)").matches;
const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; } })();
const on = reactive({ sectors: true, glide: true, stations: true, fog: true, lines: true, zones: true, wind: !reduced, ...saved.layers });
const allLayers = ref(!!saved.all);
const full = computed(() => isDesktop.value || allLayers.value);
watch([on, allLayers], () => { try { localStorage.setItem(STORE, JSON.stringify({ layers: on, all: allLayers.value })); } catch {} }, { deep: true });
const LIGHT = [["sectors", "Startsektoren"], ["glide", "Gleitpfad"], ["stations", "Messstationen"]];
const HEAVY = computed(() => [["fog", "Nebel und Wolken"], ["lines", "Leitungen, Bahnen"], ...(hasZones ? [["zones", "Sperrzonen"]] : []), ["wind", "Windfeld"]]);

let map = null, markers = [], mapSite = null, retryTimer = null, wind = null;
const site = () => D.R.SITES.find(x => x.id === D.S.tab);
// Start und Landeplatz sollen beide im Bild sein, auf dem schmalen Handybild deshalb weiter weg
const view = s => ({ center: [(s.lon + s.landing.lon) / 2, (s.lat + s.landing.lat) / 2], zoom: isDesktop.value ? 12.3 : 11.5 });
const loadAsset = (tag, attrs) => new Promise((res, rej) => { const el = document.createElement(tag); Object.assign(el, attrs); el.onload = res; el.onerror = () => rej(new Error("Laden fehlgeschlagen: " + (attrs.src || attrs.href))); document.head.appendChild(el); });

// ---- Zeitregler: arbeitet auf der gemeinsamen Stundenauswahl
const hours = computed(() => { D.sync(); return curDay()?.hours.map(h => h.hour) || []; });
const curHour = computed(() => { D.sync(); return profileHour(site())?.hour ?? hours.value[0]; });
function setHour(h) { D.SEL.hour = +h; }
let playTimer = null;
function togglePlay() {
  if (playing.value) { stopPlay(); return; }
  playing.value = true;
  const step = () => {
    const hs = hours.value, i = hs.indexOf(curHour.value);
    if (i < 0 || i >= hs.length - 1) { stopPlay(); return; }
    setHour(hs[i + 1]); playTimer = setTimeout(step, 900);
  };
  if (curHour.value === hours.value.at(-1)) setHour(hours.value[0]);
  playTimer = setTimeout(step, 400);
}
function stopPlay() { clearTimeout(playTimer); playing.value = false; }
const levelColor = l => l == null ? "#8c9eab" : ["#1e9a55", "#d89e00", "#d23c3c"][l];

async function init() {
  if (status.value !== "idle") return;
  status.value = "loading";
  try {
    if (!window.maplibregl) { await loadAsset("link", { rel: "stylesheet", href: MAPLIBRE_CSS }); await loadAsset("script", { src: MAPLIBRE_JS }); }
    const s = site();
    map = new window.maplibregl.Map({ container: box.value, style: "https://tiles.openfreemap.org/styles/liberty", ...view(s), pitch: 62, bearing: -15, maxPitch: 80, attributionControl: { compact: true } });
    map.addControl(new window.maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => {
      const dem = { type: "raster-dem", tiles: ["https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"], encoding: "terrarium", tileSize: 512, maxzoom: 12, attribution: "© Mapterhorn" };
      map.addSource("dem", dem); map.addSource("dem-hs", { ...dem }); map.addSource("dem-relief", { ...dem });
      map.addLayer({ id: "hillshade", type: "hillshade", source: "dem-hs", paint: { "hillshade-exaggeration": 0.35 } });
      map.setTerrain({ source: "dem", exaggeration: EXAG });
      addOverlays();
      mapSite = s.id; status.value = "ready";
      box.value?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      update();
      map.once("idle", update);   // Gelände für den Gleitpfad ist dann geladen
    });
    map.on("error", e => console.warn("[karte]", e?.error?.message));
  } catch (e) { status.value = "error"; error.value = e.message; }
}
function addOverlays() {
  map.addLayer({ id: "relief", type: "color-relief", source: "dem-relief", layout: { visibility: "none" }, paint: { "color-relief-opacity": 1, "color-relief-color": ["interpolate", ["linear"], ["elevation"], 0, "rgba(255,255,255,0)", 9000, "rgba(255,255,255,0)"] } });
  (D.R.zones || []).forEach(z => {
    map.addSource(z.id, { type: "raster", tiles: [`https://wmts.geo.admin.ch/1.0.0/${z.id}/default/current/3857/{z}/{x}/{y}.png`], tileSize: 256, attribution: '<a href="https://map.geo.admin.ch" target="_blank" rel="noopener">© geo.admin.ch (BAFU, BAZL)</a>' });
    map.addLayer({ id: z.id, type: "raster", source: z.id, paint: { "raster-opacity": 0.55 } });
  });
  map.addSource("lines", { type: "geojson", data: `/overlays/${D.R.id}.geojson`, attribution: "© OpenStreetMap-Mitwirkende" });
  map.addLayer({ id: "lines-power", type: "line", source: "lines", filter: ["==", ["get", "kind"], "power"], paint: { "line-color": "#c2185b", "line-width": 1.6, "line-opacity": 0.9 } });
  map.addLayer({ id: "lines-lift", type: "line", source: "lines", filter: ["==", ["get", "kind"], "lift"], paint: { "line-color": "#212b33", "line-width": 1.8, "line-dasharray": [3, 1.5] } });
  map.addSource("sectors", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "sectors-fill", type: "fill", source: "sectors", paint: { "fill-color": ["get", "color"], "fill-opacity": ["case", ["get", "sel"], 0.42, 0.2] } });
  map.addLayer({ id: "sectors-line", type: "line", source: "sectors", paint: { "line-color": ["get", "color"], "line-width": ["case", ["get", "sel"], 2, 1] } });
  map.addSource("glide", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "glide", type: "line", source: "glide", layout: { "line-cap": "round" }, paint: { "line-color": ["get", "color"], "line-width": 4, "line-dasharray": [1, 1.6] } });
}
const vis = (id, v) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v ? "visible" : "none"); };

function updateSectors() {
  vis("sectors-fill", on.sectors); vis("sectors-line", on.sectors);
  if (!on.sectors) return;
  const features = [];
  for (const s of D.R.SITES) {
    const h = profileHour(s), calm = h?.windLaunch != null && h.windLaunch < D.S.extra.calmWind;
    for (const l of s.launches || [s]) {
      const g = !h || h.dir == null ? null : calm ? 0 : sectorGrade(l, h.dir);
      features.push({ type: "Feature", properties: { color: levelColor(g), sel: s.id === D.S.tab && (!h?.score.launch || h.score.launch === l || !s.launches) }, geometry: { type: "Polygon", coordinates: [fanPolygon(l.lat ?? s.lat, l.lon ?? s.lon, l.sector)] } });
    }
  }
  map.getSource("sectors").setData({ type: "FeatureCollection", features });
}
function updateGlide() {
  const src = map.getSource("glide"); vis("glide", on.glide);
  const s = site(), h = profileHour(s);
  if (!on.glide || !h) { src.setData({ type: "FeatureCollection", features: [] }); glide.value = null; return; }
  const l = h.score.launch && h.score.launch.lat != null ? h.score.launch : s;
  const start = { lat: l.lat ?? s.lat, lon: l.lon ?? s.lon, elev: l.elev ?? s.elev }, land = s.landing;
  const dist = distM(start, land), n = Math.max(8, Math.min(40, Math.round(dist / 250))), samples = [];
  let missing = 0;
  for (let i = 1; i < n; i++) {
    const f = i / n, e = map.queryTerrainElevation([start.lon + (land.lon - start.lon) * f, start.lat + (land.lat - start.lat) * f]);
    if (e == null) missing++; else samples.push({ d: dist * f, h: e / EXAG });
  }
  const wspeed = h.w850 ?? h.windLaunch, wdir = h.d850 ?? h.dir;
  const r = glidePath({ start, land, wind: { speed: wspeed, dir: wdir }, samples });
  src.setData({ type: "FeatureCollection", features: [{ type: "Feature", properties: { color: levelColor(r.level) }, geometry: { type: "LineString", coordinates: [[start.lon, start.lat], [land.lon, land.lat]] } }] });
  glide.value = { ...r, landName: land.name, approx: !!land.approx, partial: missing > 0, hour: h.hour };
  if (missing && !retryTimer) retryTimer = setTimeout(() => { retryTimer = null; update(); }, 2500);
}
function updateFog() {
  if (!full.value || !on.fog) { vis("relief", false); return; }
  const h0 = profileHour(site());
  if (!h0) { vis("relief", false); return; }
  const pts = [];
  for (const s of D.R.SITES) {
    const h = (D.EVAL.value[s.id]?.hours || []).find(x => x.t === h0.t);
    if (!h) continue;
    pts.push({ elev: s.landing.elev, fog: landFogGrade(h) === 2 });
    pts.push({ elev: s.elev, fog: !!h.fog || (h.vis != null && h.vis < 1500) });
  }
  const expr = reliefColor({ fogTop: fogTopFrom(pts), cloudBase: h0.lowCloud >= 70 ? h0.cloudBase : null });
  if (!expr) { vis("relief", false); return; }
  map.setPaintProperty("relief", "color-relief-color", expr); vis("relief", true);
}
function updateMarkers() {
  markers.forEach(m => m.remove()); markers = [];
  const lands = new Map();
  for (const s of D.R.SITES) {
    const h = profileHour(s), lv = h ? h.score.level : null;
    const el = document.createElement("div");
    el.className = "mk" + (s.id === D.S.tab ? " sel" : "");
    el.innerHTML = `<div class="bub" style="background:${levelColor(lv)}">${h && h.dir != null ? `<svg viewBox="0 0 24 24"><g transform="rotate(${h.dir + 180} 12 12)"><path d="M12 2 L17.5 11 L13.6 11 L13.6 22 L10.4 22 L10.4 11 L6.5 11 Z" fill="#fff"/></g></svg>` : ""}</div>`
      + (s.id === D.S.tab || !s.approx ? `<div class="tag">${s.name}${s.id === D.S.tab && h && h.windLaunch != null ? ` · ${Math.round(h.windLaunch)} km/h` : ""}</div>` : "");
    el.title = `${s.name}: ${lv == null ? "keine Daten" : LEVEL_TXT[lv]}${h ? " um " + h.hour + " Uhr" : ""}`;
    el.addEventListener("click", () => { D.S.tab = s.id; D.SEL.hour = null; });
    markers.push(new window.maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([s.lon, s.lat]).addTo(map));
    lands.set(s.landing.name, s.landing);
  }
  lands.forEach(l => {
    const el = document.createElement("div"); el.className = "mk land"; el.title = l.name; el.innerHTML = `<div class="bub">L</div>`;
    markers.push(new window.maplibregl.Marker({ element: el }).setLngLat([l.lon, l.lat]).addTo(map));
  });
  // Messstationen zeigen immer den aktuellen Stand, unabhängig vom Zeitregler
  const st = D.DATA.live?.st;
  if (on.stations && st) for (const m of D.R.STATIONS) {
    const v = st[m.id];
    if (!v || m.lat == null || v.ff == null) continue;
    const el = document.createElement("div"); el.className = "mk stn";
    el.title = `${m.name} (${m.elev} m), jetzt: ${Math.round(v.ff)} km/h, Böe ${v.ffx == null ? "–" : Math.round(v.ffx)}${v.dir != null ? ", aus " + compassName(v.dir) : ""}`;
    el.innerHTML = `<div class="bub">${v.dir != null ? `<svg viewBox="0 0 24 24"><g transform="rotate(${v.dir + 180} 12 12)"><path d="M12 2 L17.5 11 L13.6 11 L13.6 22 L10.4 22 L10.4 11 L6.5 11 Z" fill="currentColor"/></g></svg>` : ""}</div><div class="tag">${m.name} ${v.ffx == null ? Math.round(v.ff) : Math.round(v.ffx)}</div>`;
    markers.push(new window.maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([m.lon, m.lat]).addTo(map));
  }
}
function update() {
  if (status.value !== "ready" || !map) return;
  D.sync();
  updateMarkers(); updateSectors(); updateGlide(); updateFog();
  vis("lines-power", full.value && on.lines); vis("lines-lift", full.value && on.lines);
  (D.R.zones || []).forEach(z => vis(z.id, full.value && on.zones));
  if (mapSite !== D.S.tab) { const s = site(); mapSite = s.id; map.easeTo({ ...view(s), duration: 1200 }); }
  syncWind();
}

// ---- Windfeld: Partikel auf Canvas, nur wenn sichtbar
let raf = null, parts = [], grid = null, gridHour = null, inView = true, loadingGrid = false;
async function syncWind() {
  const want = full.value && on.wind && !reduced && D.S.mode !== "sim";
  if (!want) { stopWind(); return; }
  if (!grid && !loadingGrid) {
    loadingGrid = true;
    try { grid = await $fetch(`/api/windgrid/${D.R.id}`, { cache: "no-cache" }); } catch (e) { console.warn("[windfeld]", e?.message); }
    loadingGrid = false;
  }
  if (!grid) return;
  const h = profileHour(site());
  gridHour = h ? grid.time.indexOf(h.t) : -1;
  if (gridHour < 0) { stopWind(); return; }
  if (!raf) startWind();
}
function stopWind() {
  if (raf) cancelAnimationFrame(raf); raf = null;
  const c = canvas.value; if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
}
function newPart() { const b = grid.bbox; return { lon: b.w + Math.random() * (b.e - b.w), lat: b.s + Math.random() * (b.n - b.s), age: Math.random() * 90 }; }
function startWind() {
  const c = canvas.value, ctx = c.getContext("2d");
  parts = Array.from({ length: 500 }, newPart);
  let last = performance.now();
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min(now - last, 50) / 1000; last = now;
    if (!inView || document.hidden) return;
    const w = box.value.clientWidth, hh = box.value.clientHeight, dpr = devicePixelRatio || 1;
    if (c.width !== w * dpr || c.height !== hh * dpr) { c.width = w * dpr; c.height = hh * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,0.09)"; ctx.fillRect(0, 0, w, hh);
    ctx.globalCompositeOperation = "source-over"; ctx.lineWidth = 1.5;
    const U = grid.u[gridHour], V = grid.v[gridHour], speed = 0.1 * dt;   // km je km/h, stark zeitgerafft und unabhängig von der Bildrate
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i], u = gridAt(grid.bbox, grid.n, U, p.lon, p.lat), v = gridAt(grid.bbox, grid.n, V, p.lon, p.lat);
      if (u == null || v == null || ++p.age > 110) { parts[i] = { ...newPart(), age: 0 }; continue; }
      const a = map.project([p.lon, p.lat]);
      p.lon += u * speed / (111 * Math.cos(p.lat * Math.PI / 180)); p.lat += v * speed / 111;
      const b = map.project([p.lon, p.lat]), s = Math.hypot(u, v);
      ctx.strokeStyle = s < 12 ? "rgba(20,70,130,0.8)" : s < 25 ? "rgba(235,150,0,0.95)" : "rgba(215,40,40,0.95)";
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  };
  frame();
}

watch(() => [D.S.tab, D.SEL.dayIdx, D.SEL.hour, D.EVAL.value, D.DATA.live, full.value, ...Object.values(on)], update);
// Desktop lädt von selbst, mobil auf Knopfdruck
let io = null;
onMounted(() => {
  watch(isDesktop, d => { if (d) nextTick(init); }, { immediate: true });
  io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; }); if (box.value) io.observe(box.value);
});
onUnmounted(() => { stopPlay(); stopWind(); clearTimeout(retryTimer); io?.disconnect(); map?.remove(); });
const gl = computed(() => glide.value);
const round10 = v => Math.round(v / 10) * 10;
</script>

<template>
  <section class="card map-card">
    <h2>3D-Karte {{ D.R.areaName }} <small>Ampel der gewählten Stunde</small></h2>
    <div ref="box" class="map3d">
      <canvas ref="canvas" class="windcv" />
      <div v-if="status !== 'ready'" class="placeholder">
        <div v-if="status === 'idle'">
          <div style="font-family:var(--font-display);font-size:20px;font-weight:700">Gelände in 3D</div>
          <div class="hint">Startplätze in Ampelfarbe, Sektoren, Gleitpfad und gemessener Wind. Lädt Karte und Gelände (einige MB).</div>
          <button type="button" class="btn primary" style="margin-top:10px" @click="init">3D-Karte laden</button>
        </div>
        <div v-else-if="status === 'loading'" class="hint">Lade 3D-Karte…</div>
        <div v-else class="err">{{ error }}</div>
      </div>
    </div>
    <template v-if="status === 'ready'">
      <div class="map-time">
        <button type="button" class="playbtn" :aria-label="playing ? 'Anhalten' : 'Tag abspielen'" @click="togglePlay">
          <svg viewBox="0 0 16 16"><path v-if="playing" d="M4 2 H7 V14 H4 Z M9 2 H12 V14 H9 Z" /><path v-else d="M4 2 L14 8 L4 14 Z" /></svg>
        </button>
        <input type="range" aria-label="Stunde auf der Karte" :min="hours[0]" :max="hours.at(-1)" step="1" :value="curHour" @input="stopPlay(); setHour($event.target.value)">
        <span class="tltime">{{ curHour }}:00</span>
      </div>
      <div class="map-layers">
        <label v-for="[k, t] in LIGHT" :key="k"><input v-model="on[k]" type="checkbox"> {{ t }}</label>
        <template v-if="full"><label v-for="[k, t] in HEAVY" :key="k"><input v-model="on[k]" type="checkbox" :disabled="k === 'wind' && reduced"> {{ t }}</label></template>
        <label v-if="!isDesktop"><input v-model="allLayers" type="checkbox"> Alle Ebenen (mehr Daten)</label>
      </div>
      <div v-if="gl && on.glide" class="flag" :class="gl.level === 2 ? 'stop' : gl.level === 1 ? 'warn' : ''">
        <b>Gleitpfad {{ gl.hour }} Uhr nach {{ gl.landName }}:</b>
        <template v-if="gl.reserve != null"> Reserve ca. {{ round10(gl.reserve) }} m<template v-if="gl.clearance != null">, Abstand zum Gelände min. {{ round10(gl.clearance) }} m</template>.</template>
        {{ gl.reason || "" }}
        <div class="hint">Grobe Abschätzung in Luftlinie bei Gleitzahl 1:7 mit Höhenwind{{ gl.partial ? ", Gelände lädt noch" : "" }}{{ gl.approx ? ", Landeplatz ungefähr" : "" }}. Keine Thermik, kein Lee, keine Volte. Ersetzt keine Flugplanung.</div>
      </div>
      <div class="hint">
        Ziehen = verschieben, zwei Finger = drehen und neigen. Startplatz antippen wechselt den Tab. Stationen zeigen immer die aktuelle Messung in km/h (Böe).
        <template v-if="full && on.fog"> Weiss im Tal: Nebel aus der Prognose. Weiss am Berg: Wolkenbasis. Beides grob.</template>
        <template v-if="full && on.lines"> Leitungen (rosa) und Bahnen aus OpenStreetMap sind <b>nicht vollständig</b>: Fehlt eine Linie, heisst das nicht, dass dort kein Kabel ist.</template>
        <template v-if="full && hasZones && on.zones"> Sperrzonen (flächig rot und violett) von geo.admin.ch, ohne Gewähr. Die Fächer mit Rand an den Startplätzen sind dagegen die Startsektoren. Vor dem Flug auf map.geo.admin.ch und vor Ort prüfen.</template>
        <template v-if="full && on.wind"> Windfeld: Prognose für 10 m über Grund im groben Raster, Täler sind geglättet. Blau unter 12, gelb bis 25, rot ab 25 km/h.</template>
      </div>
    </template>
  </section>
</template>
