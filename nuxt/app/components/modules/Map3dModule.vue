<script setup lang="ts">
// 3D-Gelände (MapLibre + Mapterhorn), lädt erst auf Knopfdruck. Marker in Ampelfarbe der gewählten Stunde.
// @ts-nocheck
import { profileHour } from "#shared/engine";
import { LEVEL_TXT } from "#shared/format";
const MAPLIBRE_JS = "https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.css";
const D = useDash();
const box = ref<HTMLElement | null>(null);
const status = ref<"idle" | "loading" | "ready" | "error">("idle"), error = ref("");
let map: any = null, markers: any[] = [], mapSite: string | null = null;
const loadAsset = (tag, attrs) => new Promise((res, rej) => { const el = document.createElement(tag); Object.assign(el, attrs); el.onload = res; el.onerror = () => rej(new Error("Laden fehlgeschlagen: " + (attrs.src || attrs.href))); document.head.appendChild(el); });
const site = () => D.R.SITES.find(x => x.id === D.S.tab);

async function init() {
  status.value = "loading";
  try {
    if (!window.maplibregl) { await loadAsset("link", { rel: "stylesheet", href: MAPLIBRE_CSS }); await loadAsset("script", { src: MAPLIBRE_JS }); }
    const s = site();
    map = new window.maplibregl.Map({ container: box.value, style: "https://tiles.openfreemap.org/styles/liberty", center: [s.lon, s.lat - 0.012], zoom: 12.3, pitch: 62, bearing: -15, maxPitch: 80, attributionControl: { compact: true } });
    map.addControl(new window.maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => {
      const dem = { type: "raster-dem", tiles: ["https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"], encoding: "terrarium", tileSize: 512, maxzoom: 12, attribution: "© Mapterhorn" };
      map.addSource("dem", dem); map.addSource("dem-hs", { ...dem });
      map.addLayer({ id: "hillshade", type: "hillshade", source: "dem-hs", paint: { "hillshade-exaggeration": 0.35 } });
      map.setTerrain({ source: "dem", exaggeration: 1.4 });
      mapSite = s.id; status.value = "ready";
      box.value?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      update();
    });
  } catch (e) { status.value = "error"; error.value = e.message; }
}
function update() {
  if (status.value !== "ready" || !map) return;
  D.sync();
  markers.forEach(m => m.remove()); markers = [];
  const lands = new Map();
  for (const s of D.R.SITES) {
    const h = profileHour(s), lv = h ? h.score.level : null;
    const el = document.createElement("div");
    el.className = "mk" + (s.id === D.S.tab ? " sel" : "");
    el.innerHTML = `<div class="bub" style="background:${lv == null ? "#8c9eab" : ["#1e9a55", "#d89e00", "#d23c3c"][lv]}">${h && h.dir != null ? `<svg viewBox="0 0 24 24"><g transform="rotate(${h.dir + 180} 12 12)"><path d="M12 2 L17.5 11 L13.6 11 L13.6 22 L10.4 22 L10.4 11 L6.5 11 Z" fill="#fff"/></g></svg>` : ""}</div>`
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
  if (mapSite !== D.S.tab) { const s = site(); mapSite = s.id; map.easeTo({ center: [s.lon, s.lat - 0.012], zoom: 12.3, duration: 1200 }); }
}
watch(() => [D.S.tab, D.SEL.dayIdx, D.SEL.hour, D.EVAL.value], update);
onUnmounted(() => map?.remove());
</script>

<template>
  <section class="card">
    <h2>3D-Karte {{ D.R.areaName }} <small>Ampel der gewählten Stunde</small></h2>
    <div ref="box" class="map3d">
      <div v-if="status !== 'ready'" class="placeholder">
        <div v-if="status === 'idle'">
          <div style="font-family:var(--font-display);font-size:20px;font-weight:700">Gelände in 3D</div>
          <div class="hint">Startplätze in Ampelfarbe, Pfeil = Modellwind am Start. Lädt Karte und Gelände (einige MB).</div>
          <button type="button" class="btn primary" style="margin-top:10px" @click="init">3D-Karte laden</button>
        </div>
        <div v-else-if="status === 'loading'" class="hint">Lade 3D-Karte…</div>
        <div v-else class="err">{{ error }}</div>
      </div>
    </div>
    <div class="hint">Ziehen = verschieben, zwei Finger = drehen und neigen. Startplatz antippen wechselt den Tab. Gelände: Mapterhorn, Karte: OpenFreeMap / OpenStreetMap.</div>
  </section>
</template>
