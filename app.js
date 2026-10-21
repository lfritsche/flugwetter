"use strict";

/* ============================================================
   CONFIG: Startplätze, Kameras, Stationen, Level, Links.
   Neuer Startplatz = neuer Eintrag in SITES.
   ============================================================ */
const R = window.REGION;
const { SITES, STATIONS, LINKS } = R;
const STATION_NAME = Object.fromEntries(STATIONS.map(s => [s.id, s.name]));
/* Föhn: bi = Hauptpaar, lz = Vergleichspaar (Namen historisch) */
const FOEHN = R.foehn;
const FOEHN_POINTS = [FOEHN.primary.a, FOEHN.primary.b, FOEHN.secondary.a, FOEHN.secondary.b];

/* Parameter. key2 = Schlüsselwert (gelb verhindert grün). invert: kleiner ist schlechter. */
const PARAMS = [
  { key: "windLaunch", label: "Wind am Start",          unit: "km/h", weight: 3, key2: true },
  { key: "gust",       label: "Böen am Start",          unit: "km/h", weight: 3, key2: true },
  { key: "spread",     label: "Böigkeit (Böe − Mittel)", unit: "km/h", weight: 2 },
  { key: "windLand",   label: "Wind am Landeplatz",     unit: "km/h", weight: 2 },
  { key: "w850",       label: "Wind 850 hPa (~1500 m)", unit: "km/h", weight: 2 },
  { key: "w700",       label: "Wind 700 hPa (~3000 m)", unit: "km/h", weight: 1 },
  { key: "foehn",      label: "Föhn " + FOEHN.primary.label, unit: "hPa",  weight: 3, key2: true },
  { key: "cape",       label: "CAPE (Gewitterenergie)", unit: "J/kg", weight: 2 },
  { key: "li",         label: "Lifted Index",           unit: "",     weight: 1, invert: true },
  { key: "cloud",      label: "Wolkenbasis über Start", unit: "m",    weight: 2, invert: true },
  { key: "rain",       label: "Niederschlag",           unit: "mm/h", weight: 3 },
  { key: "blh",        label: "Grenzschicht (grob)", unit: "m", weight: 1 },
];
/* Anfänger/Fortgeschrittene: grün nur, wenn keiner dieser Werte gelb ist */
const BEGINNER_STRICT = ["cape", "li", "rain", "cloud", "spread", "gust", "windLand", "foehn", "dir", "lee", "w850", "windLaunch", "vis", "front"];
const PSEUDO = {
  dir:    { label: "Windrichtung am Start", weight: 3, key2: true },
  season: { label: "Saison / Tageszeit",    weight: 1 },
  lee:    { label: "Lee-Lage",              weight: 2 },
  closed: { label: "Startplatz gesperrt",   weight: 3 },
};

/* Level-Presets: [grün bis, rot über] */
const LEVELS = [
  { name: "Anfänger", desc: "Frischer Schein, wenige Höhenflüge. Nur ruhige, gleichmäßige Bedingungen sind grün.",
    v: { windLaunch: [12, 18], gust: [18, 25], spread: [8, 12], windLand: [12, 20], w850: [15, 25], w700: [20, 30], foehn: [2, 4], cape: [300, 800], li: [2, 0], cloud: [500, 300], rain: [0.05, 0.2], blh: [1500, 2500] } },
  { name: "Fortgeschritten", desc: "Sichere Starts auch bei etwas Wind, erste Thermikflüge.",
    v: { windLaunch: [15, 22], gust: [22, 30], spread: [10, 15], windLand: [15, 24], w850: [20, 30], w700: [30, 40], foehn: [2, 4], cape: [400, 1000], li: [1, -1], cloud: [400, 150], rain: [0.05, 0.3], blh: [2000, 3000] } },
  { name: "Erfahren", desc: "Regelmäßig Thermik und Strecke, kennt die Eigenheiten der Gelände.",
    v: { windLaunch: [18, 25], gust: [25, 32], spread: [12, 18], windLand: [18, 28], w850: [25, 35], w700: [35, 45], foehn: [3, 5], cape: [600, 1200], li: [0, -2], cloud: [300, 100], rain: [0.1, 0.5], blh: [2800, 3800] } },
  { name: "Experte", desc: "Viel Erfahrung, aktives Fliegen in starker Luft. Föhn bleibt auch hier ein Ausschlussgrund.",
    v: { windLaunch: [22, 30], gust: [30, 38], spread: [15, 22], windLand: [22, 32], w850: [30, 40], w700: [45, 55], foehn: [4, 6], cape: [800, 1500], li: [-1, -3], cloud: [200, 50], rain: [0.2, 1], blh: [3500, 4500] } },
];
const EXTRA_DEFS = [
  { key: "calmWind",    label: "Unter diesem Wind ist die Richtung egal", unit: "km/h", v: 6 },
  { key: "dirTol",      label: "Toleranz am Sektorrand (ohne Holfuy-Sektor)", unit: "°", v: 20 },
  { key: "modelSpread", label: "Modelle uneinig bei Böen: Stufe schlechter ab", unit: "km/h", v: 10 },
  { key: "hourFrom",    label: "Erste Stunde", unit: "Uhr", v: 8 },
  { key: "hourTo",      label: "Letzte Stunde", unit: "Uhr", v: 19 },
  { key: "simDays",     label: "Rückblick: Anzahl Tage", unit: "Tage", v: 30 },
];

/* Ansichten */
/* Flugart: Hike & Fly (Abgleiter in Geländenähe) oder Thermik / Strecke */
const FLIGHTS = {
  hf: { label: "Hike & Fly / Abgleiter", short: "Hike & Fly" },
  xc: { label: "Thermik / Strecke", short: "Thermik / Strecke" },
};
const XC = { blhGood: 1500, blhMin: 800, baseGood: 1000, baseMin: 500 };   // m über Grund / über Start
const MODES = {
  live: { label: "Live 3 Tage", days: 3 },
  week: { label: "7 Tage", days: 7 },
  sim:  { label: "Rückblick", days: null },
};


/* ============================================================
   Settings (nur dieses Gerät)
   ============================================================ */
const STORE_KEY = R.storeKey;
const MODULE_IDS = ["live", "profile", "map3d", "history", "foehn", "aloft", "site", "links"];

function presetLimits(i) {
  const out = {};
  PARAMS.forEach(p => { const [g, r] = LEVELS[i].v[p.key]; out[p.key] = { g, r }; });
  return out;
}
function defaultSettings() {
  const extra = {}; EXTRA_DEFS.forEach(d => extra[d.key] = d.v);
  const modules = {}; MODULE_IDS.forEach(id => modules[id] = true);
  return { level: 0, levelBase: 0, limits: presetLimits(0), extra, modules, order: MODULE_IDS.slice(), tab: SITES[0].id, mode: "live", flight: "hf" };
}
function loadSettings() {
  const def = defaultSettings();
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!s) return def;
    const order = Array.isArray(s.order) ? s.order.filter(id => MODULE_IDS.includes(id)) : [];
    return {
      level: s.level === "custom" || (Number.isInteger(s.level) && LEVELS[s.level]) ? s.level : 0,
      levelBase: Number.isInteger(s.levelBase) && LEVELS[s.levelBase] ? s.levelBase : 0,
      limits: Object.assign(def.limits, s.limits || {}),
      extra: Object.assign(def.extra, s.extra || {}),
      modules: Object.assign(def.modules, s.modules || {}),
      order: MODULE_IDS.reduce((o, id, i) => { if (!o.includes(id)) o.splice(Math.min(i, o.length), 0, id); return o; }, order.slice()),
      tab: SITES.some(x => x.id === s.tab) ? s.tab : def.tab,
      mode: MODES[s.mode] && s.mode !== "sim" ? s.mode : "live",   // Rückblick startet nie automatisch
      flight: FLIGHTS[s.flight] ? s.flight : "hf",
    };
  } catch (e) { return def; }
}
function saveSettings() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* blockiert: egal */ } }
let S = loadSettings();

/* ============================================================
   Daten
   ============================================================ */
const HOURLY = [
  "wind_speed_10m", "wind_gusts_10m", "wind_direction_10m",
  "wind_speed_850hPa", "wind_direction_850hPa", "wind_speed_700hPa", "wind_direction_700hPa",
  "cape", "lifted_index", "precipitation", "cloud_base", "cloud_cover_low", "boundary_layer_height",
  "visibility", "pressure_msl", "weather_code",
].join(",");
const MODELS_LIVE = "icon_d2,meteoswiss_icon_ch2,icon_eu,ecmwf_ifs025,gfs_seamless";
const MODELS_SIM = "icon_d2,meteoswiss_icon_ch2,gfs_seamless";
const OM_LIVE = "https://api.open-meteo.com/v1/forecast?";
const OM_HIST = "https://historical-forecast-api.open-meteo.com/v1/forecast?";

async function getJSON(url, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status + " bei " + new URL(url).host);
      return await r.json();
    } catch (e) {
      if (i >= tries - 1) throw e;
      await new Promise(res => setTimeout(res, 1500 * (i + 1)));   // kurze Störungen (503) abfangen
    }
  }
}
const dateStr = d => localKey(d).slice(0, 10);
/* range: {past_days, forecast_days} oder {start_date, end_date} */
async function fetchForecast(base, range, models) {
  const pts = SITES.flatMap(s => [s, s.landing]);
  const q = new URLSearchParams({
    latitude: pts.map(p => p.lat).join(","), longitude: pts.map(p => p.lon).join(","),
    elevation: pts.map(p => p.elev).join(","),
    hourly: HOURLY, daily: "sunrise,sunset", models, timezone: "Europe/Vienna", ...range,
  });
  const arr = await getJSON(base + q);
  const out = {};
  SITES.forEach((s, i) => {
    const dly = arr[i * 2].daily || {}, sun = {};
    // Modell-Suffixe bei daily: erstes vorhandenes Feld nehmen
    const pick = k => dly[k] || dly[Object.keys(dly).find(x => x.startsWith(k + "_"))] || [];
    (dly.time || []).forEach((d, j) => { const r = pick("sunrise")[j], t = pick("sunset")[j]; if (r && t) sun[d] = { rise: +r.slice(11, 13) * 60 + +r.slice(14, 16), set: +t.slice(11, 13) * 60 + +t.slice(14, 16) }; });
    out[s.id] = { launch: arr[i * 2].hourly, land: arr[i * 2 + 1].hourly, sun };
  });
  return out;
}
async function fetchFoehn(base, range) {
  const q = new URLSearchParams({
    latitude: FOEHN_POINTS.map(p => p.lat).join(","), longitude: FOEHN_POINTS.map(p => p.lon).join(","),
    hourly: "pressure_msl", timezone: "Europe/Vienna", ...range,
  });
  const arr = await getJSON(base + q);
  const p = FOEHN_POINTS.map((_, i) => arr[i].hourly.pressure_msl);
  const time = arr[0].hourly.time;
  const d = (a, b) => a == null || b == null ? null : Math.round((a - b) * 10) / 10;
  const bi = time.map((_, i) => d(p[0][i], p[1][i]));
  const lz = time.map((_, i) => d(p[2][i], p[3][i]));
  const byTime = {}; time.forEach((t, i) => byTime[t] = { bi: bi[i], lz: lz[i] });
  return { time, bi, lz, byTime };
}
/* Stations-Provider: liefern live → {ts, st:{id:{dir,ff,ffx}}} und history(h) → {id:{"YYYY-MM-DDTHH:00":{dir,ff,ffx}}} in km/h */
function hourBuckets(samples) {   // samples: [{t: Date, dir, ff, ffx}]
  const buckets = {};
  samples.forEach(x => {
    if (x.ff == null) return;
    const k = localKey(x.t);
    const b = buckets[k] = buckets[k] || { u: 0, w: 0, s: 0, g: 0, n: 0 };
    const rad = (x.dir ?? 0) * Math.PI / 180;
    b.u += Math.sin(rad) * x.ff; b.w += Math.cos(rad) * x.ff; b.s += x.ff; b.g = Math.max(b.g, x.ffx ?? 0); b.n++;
  });
  const out = {};
  Object.entries(buckets).forEach(([k, b]) => out[k] = { ff: b.s / b.n, ffx: b.g, dir: (Math.atan2(b.u, b.w) * 180 / Math.PI + 360) % 360 });
  return out;
}
const PROVIDERS = {
  geosphere: {
    parse(d) {
      return (d.features || []).reduce((acc, f) => {
        const p = f.properties.parameters, arr = k => (p[k] && p[k].data) || [];
        acc[f.properties.station] = { dir: arr("DD"), ff: arr("FF").map(v => v == null ? null : v * 3.6), ffx: arr("FFX").map(v => v == null ? null : v * 3.6) };
        return acc;
      }, {});
    },
    async live() {
      const q = new URLSearchParams({ parameters: "DD,FF,FFX", station_ids: STATIONS.map(s => s.id).join(",") });
      const d = await getJSON("https://dataset.api.hub.geosphere.at/v1/station/current/tawes-v1-10min?" + q);
      const st = this.parse(d), out = { ts: d.timestamps && d.timestamps[0], st: {} };
      Object.entries(st).forEach(([id, v]) => out.st[id] = { dir: v.dir[0] ?? null, ff: v.ff[0] ?? null, ffx: v.ffx[0] ?? null });
      return out;
    },
    async history(hoursBack) {
      const ids = [...new Set(SITES.flatMap(s => [s.historyStation, s.measureStation]).filter(Boolean))];
      const start = new Date(Date.now() - hoursBack * 3600e3).toISOString().slice(0, 16);
      const end = new Date().toISOString().slice(0, 16);
      const q = new URLSearchParams({ parameters: "DD,FF,FFX", station_ids: ids.join(","), start, end });
      const d = await getJSON("https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min?" + q);
      const st = this.parse(d), out = {};
      Object.entries(st).forEach(([id, v]) => out[id] = hourBuckets(d.timestamps.map((ts, i) => ({ t: new Date(ts), dir: v.dir[i], ff: v.ff[i], ffx: v.ffx[i] }))));
      return out;
    },
  },
};
/* Südtiroler Landeswetterdienst: WG = Mittel, WG.BOE = Böe (m/s), WR = Richtung; DATE mit CEST/CET-Suffix */
const BZ = "https://geoservices.buergernetz.bz.it/services/meteo/v1";
const bzDate = s => new Date(s.replace("CEST", "+02:00").replace("CET", "+01:00"));
const ymd = d => dateStr(d).replace(/-/g, "");
PROVIDERS.suedtirol = {
  async live() {
    const out = { ts: null, st: {} };
    await Promise.all(STATIONS.map(async st => {
      try {
        const rows = await getJSON(`${BZ}/sensors?station_code=${st.id}`);
        const v = t => rows.find(r => r.TYPE === t);
        const wg = v("WG"), gb = v("WG.BOE"), wr = v("WR");
        out.st[st.id] = { dir: wr ? wr.VALUE : null, ff: wg ? wg.VALUE * 3.6 : null, ffx: gb ? gb.VALUE * 3.6 : null };
        const t = wg && bzDate(wg.DATE);
        if (t && (!out.ts || t > new Date(out.ts))) out.ts = t.toISOString();
      } catch (e) { out.st[st.id] = {}; }
    }));
    return out;
  },
  async history(hoursBack) {
    const ids = [...new Set(SITES.flatMap(s => [s.historyStation, s.measureStation]).filter(Boolean))];
    const from = ymd(new Date(Date.now() - hoursBack * 3600e3)), to = ymd(new Date(Date.now() + 864e5));
    const out = {};
    await Promise.all(ids.map(async id => {
      const get = code => getJSON(`${BZ}/timeseries?station_code=${id}&sensor_code=${code}&date_from=${from}&date_to=${to}`);
      const [wg, gb, wr] = await Promise.all([get("WG"), get("WG.BOE"), get("WR")]);
      const byT = {};
      const put = (arr, k, f) => arr.forEach(r => { (byT[r.DATE] = byT[r.DATE] || { t: bzDate(r.DATE) })[k] = f(r.VALUE); });
      put(wg, "ff", v => v * 3.6); put(gb, "ffx", v => v * 3.6); put(wr, "dir", v => v);
      out[id] = hourBuckets(Object.values(byT));
    }));
    return out;
  },
};
const PROVIDER = PROVIDERS[R.stationProvider];
const fetchLive = () => PROVIDER.live();
const fetchHistory = h => PROVIDER.history(h);

/* ============================================================
   Burnair (nur mit eigenem Burnair-Login über den Proxy-Worker)
   ============================================================ */
const BURNAIR_PROXY = ["localhost", "127.0.0.1"].includes(location.hostname) ? "http://127.0.0.1:8787" : (R.burnairProxy || "");
const BA_KEY = "flugwetter.burnair";
const baLoad = () => { try { const a = JSON.parse(localStorage.getItem(BA_KEY) || "null"); return a && a.exp > Date.now() ? a : null; } catch (e) { return null; } };
const baSave = a => { try { a ? localStorage.setItem(BA_KEY, JSON.stringify(a)) : localStorage.removeItem(BA_KEY); } catch (e) { /* egal */ } };
let BA = baLoad();

async function burnairLogin(username, password) {
  const r = await fetch(BURNAIR_PROXY + "/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Login fehlgeschlagen");
  BA = { token: d.token, exp: Date.now() + Math.max(60, (d.expiresIn || 3600) - 60) * 1000, name: d.name || username };
  baSave(BA);
}
function burnairLogout() { BA = null; baSave(null); DATA.burnair = null; }

/* Punktprognose dekodieren: Wind auf Starthöhe (Modellschichten), Böe, Basis, Thermikobergrenze, Regen */
function decodeBurnair(d, elev) {
  const V = d.data_vars, val = (k, x) => (x == null || x === V[k].attrs._FillValue) ? null : x * (V[k].attrs.scale_factor || 1);
  const hhl = V["hhl-ml"].data.map(x => val("hhl-ml", x));          // MSL, von oben nach unten
  const hsurf = val("hsurf-sl", V["hsurf-sl"].data);
  const at1 = (k, ti) => V[k] ? val(k, V[k].data[ti]) : null;
  const windAt = (alt, ti) => {
    const ws = V["wind_strength-ml"].data, wd = V["wind_direction-ml"].data, n = hhl.length;
    let lo = n - 1;                                                   // unterste Schicht
    if (alt <= hhl[n - 1]) return { ws: val("wind_strength-ml", ws[n - 1][ti]), wd: val("wind_direction-ml", wd[n - 1][ti]), below: true };
    for (let i = n - 1; i > 0; i--) if (hhl[i - 1] >= alt) { lo = i; break; }
    const hi = lo - 1, f = (alt - hhl[lo]) / (hhl[hi] - hhl[lo]);
    const vec = i => { const s = val("wind_strength-ml", ws[i][ti]), r = val("wind_direction-ml", wd[i][ti]) * Math.PI / 180; return [s * Math.sin(r), s * Math.cos(r)]; };
    const a = vec(lo), b = vec(hi), u = a[0] + (b[0] - a[0]) * f, v = a[1] + (b[1] - a[1]) * f;
    return { ws: Math.hypot(u, v), wd: (Math.atan2(u, v) * 180 / Math.PI + 360) % 360, below: false };
  };
  const out = {};
  d.coords.valid_time.data.forEach((ts, ti) => {
    const w = windAt(elev, ti), cb = at1("cloudbase-sl", ti), top = at1("htop_dc-sl", ti);
    out[localKey(new Date(ts * 1000))] = {
      ws: w.ws, wd: w.wd, belowModel: w.below, gust: at1("vmax_10m-sl", ti), rain: at1("tot_prec-sl", ti),
      cloudBase: cb && cb > 0 && cb < 15000 ? hsurf + cb : null,
      blh: top && top > hsurf ? top - hsurf : (top === 0 ? 0 : null),
      w850: windAt(1500, ti), w700: windAt(3000, ti),
    };
  });
  return { model: d.attrs.model, hsurf, hours: out };
}
async function fetchBurnair(days) {
  if (!BA || !BURNAIR_PROXY) return null;
  const dates = Array.from({ length: Math.min(days, 3) }, (_, i) => dateStr(new Date(Date.now() + i * 864e5)));
  const out = {};
  await Promise.all(SITES.map(async s => {
    const parts = await Promise.all(dates.map(async date => {
      const r = await fetch(`${BURNAIR_PROXY}/pointforecast?lat=${s.lat}&lng=${s.lon}&date=${date}`, { headers: { Authorization: BA.token } });
      if (r.status === 401) { burnairLogout(); throw new Error("Burnair-Login abgelaufen, bitte neu anmelden"); }
      if (!r.ok) throw new Error("Burnair HTTP " + r.status);
      return decodeBurnair(await r.json(), s.elev);
    }));
    out[s.id] = { model: parts[0].model, hsurf: parts[0].hsurf, hours: Object.assign({}, ...parts.map(p => p.hours)) };
  }));
  return out;
}

/* ============================================================
   Bewertung
   ============================================================ */
const mx = (...v) => { const f = v.filter(x => x != null); return f.length ? Math.max(...f) : null; };
const mn = (...v) => { const f = v.filter(x => x != null); return f.length ? Math.min(...f) : null; };
const at = (h, k, m, i) => { const a = h[k + "_" + m]; return a ? a[i] : null; };
const inSector = (dir, [a, b]) => a <= b ? dir >= a && dir <= b : dir >= a || dir <= b;
const angDist = (x, y) => { const d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; };

function annotateTrends(hours) {
  const byT = {}; hours.forEach(h => byT[h.t] = h);
  const shift = (t, dh) => localKey(new Date(new Date(t + ":00").getTime() + dh * 3600e3));
  hours.forEach(h => {
    const f3 = byT[shift(h.t, 3)], p3 = byT[shift(h.t, -3)];
    h.foehnTrend = f3 && f3.foehn != null && h.foehn != null ? f3.foehn - h.foehn : null;
    h.dp3 = p3 && p3.pmsl != null && h.pmsl != null ? h.pmsl - p3.pmsl : null;   // Druckanstieg in 3 h
  });
  return hours;
}
function buildHours(site, fc, foehn, hist) {
  const L = fc.launch, G = fc.land;
  const meas = site.measureStation && hist && hist[site.measureStation];
  const measName = site.measureStation && (STATION_NAME[site.measureStation] || site.measureStation);
  const nowKey = isSim() ? "9999" : nowLocalKey();
  return L.time.map((t, i) => {
    const wD2 = at(L, "wind_speed_10m", "icon_d2", i), wCH = at(L, "wind_speed_10m", "meteoswiss_icon_ch2", i);
    const gD2 = at(L, "wind_gusts_10m", "icon_d2", i), gCH = at(L, "wind_gusts_10m", "meteoswiss_icon_ch2", i);
    // Hochauflösend zuerst (schlechterer Wert), danach Fallback auf ICON-EU / ECMWF
    const fine = wD2 != null || wCH != null;
    const wEU = at(L, "wind_speed_10m", "icon_eu", i), wEC = at(L, "wind_speed_10m", "ecmwf_ifs025", i);
    let windLaunch = fine ? mx(wD2, wCH) : mx(wEU, wEC);
    let gust = fine ? mx(gD2, gCH) : mx(at(L, "wind_gusts_10m", "icon_eu", i), at(L, "wind_gusts_10m", "ecmwf_ifs025", i));
    let dir;
    if (fine) dir = (wD2 != null && (wCH == null || wD2 >= wCH)) ? at(L, "wind_direction_10m", "icon_d2", i) : at(L, "wind_direction_10m", "meteoswiss_icon_ch2", i);
    else dir = at(L, "wind_direction_10m", "icon_eu", i) ?? at(L, "wind_direction_10m", "ecmwf_ifs025", i);
    // Burnair (falls angemeldet): Wind auf Starthöhe aus den Modellschichten
    const ba = !isSim() && DATA.burnair && DATA.burnair[site.id] ? DATA.burnair[site.id].hours[t] : null;
    if (ba && ba.ws != null) { windLaunch = ba.ws; dir = ba.wd; if (ba.gust != null) gust = ba.gust; }
    // Messung schlägt Modell: Modelle treffen den Bodenwind in engen Tälern oft nicht
    let m = meas && t <= nowKey ? meas[t] : null;
    if (!m && site.measureStation && t === nowKey && DATA.live && DATA.live.st[site.measureStation] && DATA.live.st[site.measureStation].ff != null) m = DATA.live.st[site.measureStation];
    // Talstation (Rolle "landing") ersetzt nur den Landewind, nie den Wind am Start
    const mLand = m && site.measureRole === "landing" ? m : null;
    if (mLand) m = null;
    const model = m ? { dir, windLaunch, gust } : null;
    if (m) { dir = m.dir; windLaunch = m.ff; gust = m.ffx; }
    const landFine = mx(at(G, "wind_speed_10m", "icon_d2", i), at(G, "wind_speed_10m", "meteoswiss_icon_ch2", i));
    const cb = at(L, "cloud_base", "meteoswiss_icon_ch2", i);
    const cloudBase = ba ? ba.cloudBase : (cb == null || cb > 15000 ? null : cb);   // >15 km = keine Wolke
    const f = foehn && foehn.byTime[t];
    const firstOf = (k, ms) => { for (const m of ms) { const v = at(L, k, m, i); if (v != null) return v; } return null; };
    const upper = ["icon_d2", "icon_eu", "ecmwf_ifs025", "gfs_seamless"];
    return {
      t, day: t.slice(0, 10), hour: +t.slice(11, 13), sun: fc.sun ? fc.sun[t.slice(0, 10)] : null,
      windLaunch, gust, dir,
      spread: windLaunch != null && gust != null ? Math.max(0, gust - windLaunch) : null,
      windLand: mLand ? mLand.ff : landFine ?? mx(at(G, "wind_speed_10m", "icon_eu", i), at(G, "wind_speed_10m", "ecmwf_ifs025", i)),
      landMeasured: mLand ? measName : null,
      vis: mn(at(L, "visibility", "icon_d2", i), at(L, "visibility", "gfs_seamless", i)),
      wx: mx(at(L, "weather_code", "icon_d2", i), at(L, "weather_code", "meteoswiss_icon_ch2", i)),
      pmsl: at(L, "pressure_msl", "icon_d2", i) ?? at(L, "pressure_msl", "meteoswiss_icon_ch2", i) ?? at(L, "pressure_msl", "gfs_seamless", i),
      w850: ba && !ba.w850.below ? ba.w850.ws : firstOf("wind_speed_850hPa", upper), d850: ba && !ba.w850.below ? ba.w850.wd : firstOf("wind_direction_850hPa", upper),
      w700: ba ? ba.w700.ws : firstOf("wind_speed_700hPa", upper), d700: ba ? ba.w700.wd : firstOf("wind_direction_700hPa", upper),
      dirLand: at(G, "wind_direction_10m", "icon_d2", i) ?? at(G, "wind_direction_10m", "meteoswiss_icon_ch2", i) ?? at(G, "wind_direction_10m", "icon_eu", i),
      cape: mx(at(L, "cape", "icon_d2", i), at(L, "cape", "meteoswiss_icon_ch2", i)) ?? mx(at(L, "cape", "icon_eu", i), at(L, "cape", "ecmwf_ifs025", i), at(L, "cape", "gfs_seamless", i)),
      li: at(L, "lifted_index", "gfs_seamless", i),
      rain: ba && ba.rain != null ? ba.rain : mx(at(L, "precipitation", "icon_d2", i), at(L, "precipitation", "meteoswiss_icon_ch2", i)) ?? mx(at(L, "precipitation", "icon_eu", i), at(L, "precipitation", "ecmwf_ifs025", i)),
      cloudBase, cloud: cloudBase == null ? null : Math.round(cloudBase - site.elev),
      lowCloud: mx(at(L, "cloud_cover_low", "icon_d2", i), at(L, "cloud_cover_low", "meteoswiss_icon_ch2", i)),
      blh: ba && ba.blh != null ? ba.blh : at(L, "boundary_layer_height", "gfs_seamless", i),
      foehn: f ? (FOEHN.combine === "max" ? mx(f.bi, f.lz) : (f.bi ?? f.lz)) : null,
      lowConf: wD2 == null && !m && !ba,
      burnair: ba ? (DATA.burnair[site.id].model || "burnair") : null, baBelow: ba ? ba.belowModel : false,
      measured: m ? measName : null, model,
      modelGustDiff: !m && !ba && gD2 != null && gCH != null ? Math.abs(gD2 - gCH) : null,
    };
  });
}

/* Modell-Check: lag das Modell in den letzten gemessenen Stunden bei der Richtung daneben,
   gilt seine Richtung für die nächsten 12 Stunden als unsicher (höchstens gelb). */
function modelCheck(site, hours) {
  if (isSim()) return;
  const calm = S.extra.calmWind;
  // erst ab 10 Uhr vergleichen: morgens herrscht oft Bergwind, den Modelle nicht abbilden
  const checked = hours.filter(h => h.measured && h.model && h.model.dir != null && h.hour >= 10).slice(-5);
  const wrong = checked.filter(h => {
    const mod = h.model;
    if (h.windLaunch > 8 && h.windLaunch > 1.5 * (mod.windLaunch || 0)) return true;   // real deutlich stärker
    if (mod.windLaunch < calm && h.windLaunch < calm) return false;            // beide ruhig
    if (mod.windLaunch >= calm && h.windLaunch < calm) return true;            // Modell Wind, real ruhig
    if (mod.windLaunch < calm && h.windLaunch >= calm) return true;
    return angDist(mod.dir, h.dir) > 60;
  });
  if (checked.length < 2 || wrong.length < 2) return;
  const last = checked[checked.length - 1];
  const info = `${wrong.length} von ${checked.length} Stunden`;
  let n = 0;
  hours.forEach(h => { if (h.t > last.t && !h.measured && n < 12) { h.dirSuspect = info; n++; } });
}
function grade(v, lim, invert) {
  if (v == null) return null;
  if (invert) return v >= lim.g ? 0 : v >= lim.r ? 1 : 2;
  return v <= lim.g ? 0 : v <= lim.r ? 1 : 2;
}
/* Richtung: 0 optimal, 1 fliegbar/Rand, 2 falsch, -1 windstill, null keine Daten */
function sectorGrade(l, dir) {
  let g;
  if (inSector(dir, l.sector)) g = 0;
  else if (l.sectorWide) g = inSector(dir, l.sectorWide) ? 1 : 2;
  else g = Math.min(angDist(dir, l.sector[0]), angDist(dir, l.sector[1])) <= S.extra.dirTol ? 1 : 2;
  // maxLevelBeginner: Startplatz für Anfänger/Fortgeschrittene höchstens gelb (z. B. schwierige Landung)
  if (l.capYellow && levelIdx() <= 1 && g === 0) g = 1;
  return g;
}
/* Mehrere Startplätze (site.launches): bester passender Start pro Stunde */
function dirPick(site, dir, speed) {
  if (dir == null || speed == null) return { g: null, launch: null };
  const ls = site.launches || [site];
  if (speed < S.extra.calmWind) return { g: -1, launch: site.launches ? ls.find(l => l.calmOk) || ls[0] : null };
  let best = null;
  ls.forEach(l => { const g = sectorGrade(l, dir); if (!best || g < best.g) best = { g, launch: site.launches ? l : null }; });
  return best;
}
const dirGrade = (site, dir, speed) => dirPick(site, dir, speed).g;

function scoreHour(hr, site) {
  const reasons = [], grades = {};
  const push = (key, label, level, value, limText, weight, key2) => {
    reasons.push({ key, label, level, value, limText, weight, key2: !!key2 });
    grades[key] = level;
  };
  PARAMS.forEach(p => {
    const lim = S.limits[p.key], v = hr[p.key];
    let lv = grade(v, lim, p.invert);
    if (p.key === "cloud" && lv != null && hr.lowCloud != null && hr.lowCloud >= 90 && v < lim.r) lv = 2;
    // Hike & Fly: 700 hPa (~3000 m) liegt über der Flughöhe, starke Thermik nur Hinweis → höchstens gelb
    if (S.flight === "hf" && ((p.key === "w700" && site.elev < 1800) || p.key === "blh") && lv === 2) lv = 1;
    // Region kann Föhn für Anfänger früher rot machen (z. B. Nordföhn-Durchbruch ab 3 hPa)
    if (p.key === "foehn" && v != null && FOEHN.beginnerRed != null && levelIdx() <= 1 && v >= FOEHN.beginnerRed) lv = 2;
    // Föhn nimmt in den nächsten 3 h um ≥1 hPa zu → eine Stufe schlechter
    if (p.key === "foehn" && lv != null && lv < 2 && v >= lim.g && hr.foehnTrend >= 1) lv++;
    // Thermik/Strecke: hohe Grenzschicht und Basis sind erwünscht; zu wenig davon = gelb ("kaum Thermik")
    if (S.flight === "xc" && p.key === "blh" && v != null) lv = v >= XC.blhGood ? 0 : 1;
    if (S.flight === "xc" && p.key === "cloud" && lv === 0 && v != null && v < XC.baseGood) lv = 1;
    // Böigkeit zählt erst, wenn die Böen selbst über grün liegen (sonst Artefakt bei Windstille)
    if (p.key === "spread" && lv != null && hr.gust != null && hr.gust <= S.limits.gust.g) lv = 0;
    push(p.key, p.label, lv, v == null ? null : fmt(v, p.unit), p.invert ? `≥${lim.g} / <${lim.r}` : `≤${lim.g} / >${lim.r}`, p.weight, p.key2);
  });
  const pick = dirPick(site, hr.dir, hr.windLaunch), dg = pick.g;
  if (dg != null) {
    // unsichere Modellrichtung macht nichts freundlicher, nur gelb → bleibt gelb, grün → gelb
    const lvDir = hr.dirSuspect && dg === 0 ? 1 : Math.max(0, dg);
    const lname = pick.launch ? ` → Start ${pick.launch.name}` : "";
    push("dir", PSEUDO.dir.label + (hr.dirSuspect ? " (Modell unsicher)" : ""), lvDir, (dg === -1 ? "windstill" : `${compassName(hr.dir)} ${Math.round(hr.dir)}°`) + lname, pick.launch ? pick.launch.sectorLabel : site.sectorLabel, PSEUDO.dir.weight, true);
  }
  const month = +hr.day.slice(5, 7);
  // Tageslicht: Stunde muss mind. 30 min nach Sonnenaufgang beginnen und 30 min vor Sonnenuntergang enden
  if (hr.sun) {
    const fmtT = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
    if ((hr.hour + 1) * 60 > hr.sun.set - 30) push("dark", "Tageslicht", 2, `Sonnenuntergang ${fmtT(hr.sun.set)}`, "", 3, true);
    else if (hr.hour * 60 < hr.sun.rise + 30 - 60) push("dark", "Tageslicht", 2, `Sonnenaufgang ${fmtT(hr.sun.rise)}`, "", 3, true);
  }
  const lvl = levelIdx();
  // Automatisches Lee: Höhenwind kommt von hinten (Gegenrichtung des gewählten Startsektors)
  const sec = (pick.launch || site).sector;
  if (!site.noAutoLee && sec) {
    const center = (sec[0] + ((sec[1] - sec[0] + 360) % 360) / 2) % 360, back = (center + 180) % 360;
    const hi = site.elev >= 1800 ? { w: hr.w700, d: hr.d700, n: "3000 m" } : { w: hr.w850, d: hr.d850, n: "1500 m" };
    if (hi.w != null && hi.d != null && angDist(hi.d, back) <= 60) {
      const y = 10 + 5 * lvl, r = 20 + 5 * lvl;
      if (hi.w >= y) push("lee", "Lee: Höhenwind von hinten", hi.w >= r ? 2 : 1, `${compassName(hi.d)} ${Math.round(hi.w)} km/h (${hi.n})`, `≥${y} / ≥${r}`, PSEUDO.lee.weight, true);
    }
  }
  // Nordföhn-Signal in der Höhe (Region): Nordwind auf 3000 m und Druckgradient
  if (FOEHN.northAloft && hr.w700 >= 25 && hr.d700 != null && inSector(hr.d700, [315, 45]) && hr.foehn >= 1.5)
    push("foehn2", "Föhn-Signal: Nordwind auf 3000 m", 2, `${compassName(hr.d700)} ${Math.round(hr.w700)} km/h`, "≥25 & ≥1,5 hPa", 3, true);
  // Gegenlage: starker Stau auf der anderen Seite
  if (hr.foehn != null && hr.foehn <= -4) push("stau", FOEHN.negName + " (Stau)", 1, fmt(hr.foehn, "hPa"), "≤ −4", 1);
  // Sicht, Gewitter im Modell, Front (Druckanstieg)
  if (hr.vis != null && hr.vis < 5000) push("vis", "Sicht", hr.vis < 1500 ? 2 : 1, `${(hr.vis / 1000).toLocaleString("de-AT", { maximumFractionDigits: 1 })} km`, "<5 / <1,5 km", 2, true);
  if (hr.wx != null && hr.wx >= 95) push("wx", "Gewitter (Modell)", 2, `Code ${hr.wx}`, "", 3, true);
  if (hr.dp3 != null && hr.dp3 >= 2) push("front", "Front: Druckanstieg", hr.dp3 >= 3 ? 2 : 1, `+${hr.dp3.toFixed(1)} hPa/3 h`, "≥2 / ≥3", 2, true);
  (site.rules || []).forEach(rule => {
    if (rule.type === "closed" && rule.months.includes(month)) push("closed", rule.label, 2, "gesperrt", "", PSEUDO.closed.weight, true);
    // closedDates: [["MM-DD","MM-DD"], …] z. B. Bahn außer Betrieb zwischen den Saisonen
    if (rule.type === "closedDates" && rule.ranges.some(([a, b]) => hr.day.slice(5) >= a && hr.day.slice(5) <= b)) push("closed", rule.label, 2, "zu", "", PSEUDO.closed.weight, true);
    // lift: Bergfahrt nur in diesen Stunden möglich (Start bis kurz nach letzter Bergfahrt)
    if (rule.type === "lift" && (hr.hour < rule.hours[0] || hr.hour > rule.hours[1])) push("closed", rule.label, 2, `nur ${rule.hours[0]}–${rule.hours[1] + 1} Uhr`, "", PSEUDO.closed.weight, true);
    if (rule.type === "penalty" && rule.months.includes(month) && hr.hour >= rule.hours[0] && hr.hour <= rule.hours[1]) push("season", rule.label, 1, "Abzug", "", PSEUDO.season.weight);
    if (rule.type === "lee") {
      const up = site.elev >= 1800, w = up ? hr.w700 : hr.w850, d = up ? hr.d700 : hr.d850;
      if (d != null && w >= rule.minSpeed && inSector(d, rule.sector)) push("lee", rule.label, w >= rule.minSpeed * 2 ? 2 : 1, `${compassName(d)} ${Math.round(w)} km/h`, up ? "3000 m" : "1500 m", PSEUDO.lee.weight, true);
    }
  });
  const rated = reasons.filter(r => r.level != null);
  let sumW = 0, sumS = 0;
  rated.forEach(r => { sumW += r.weight * 3; sumS += r.weight * r.level; });
  const ratio = sumW ? sumS / sumW : 1;
  let level;
  if (!rated.length || hr.windLaunch == null) level = null;
  else if (rated.some(r => r.level === 2)) level = 2;                    // jedes Rot = Rot
  else if (ratio < 0.15 && !rated.some(r => (r.key2 || (lvl <= 1 && BEGINNER_STRICT.includes(r.key))) && r.level === 1)) level = 0;
  else level = 1;
  let bumped = false;
  if (level != null && level < 2 && hr.modelGustDiff > S.extra.modelSpread) { level++; bumped = true; }
  reasons.sort((a, b) => (b.level ?? -1) - (a.level ?? -1) || b.weight - a.weight);
  return { level, reasons, grades, ratio, bumped, dirGrade: dg, launch: pick.launch };
}

const isSim = () => S.mode === "sim";
function activeData() { return isSim() ? { fc: DATA.simFc, foehn: DATA.simFoehn, hist: DATA.simHist } : { fc: DATA.fc, foehn: DATA.foehn, hist: DATA.hist }; }

function evaluateSite(site) {
  const A = activeData();
  const hours = annotateTrends(buildHours(site, A.fc[site.id], A.foehn, A.hist));
  modelCheck(site, hours);
  hours.forEach(h => h.score = scoreHour(h, site));
  // Puffer: eine Stunde vor Gewitter, Regen, Föhn oder Front nicht mehr grün
  const HAZ = ["cape", "li", "rain", "foehn", "wx", "front"];
  hours.forEach((h, i) => {
    const nx = hours[i + 1];
    if (h.score.level === 0 && nx && HAZ.some(k => nx.score.grades[k] === 2)) {
      h.score.level = 1;
      const k = HAZ.find(k => nx.score.grades[k] === 2);
      h.score.reasons.unshift({ key: "buffer", label: "Puffer: in 1 h " + (nx.score.reasons.find(r => r.key === k) || {}).label, level: 1, value: "", limText: "", weight: 1 });
      h.score.grades.buffer = 1;
    }
  });
  const today = nowLocalKey().slice(0, 10);
  const byDay = {};
  hours.forEach(h => {
    if ((isSim() ? h.day >= today : h.day < today) || h.hour < S.extra.hourFrom || h.hour > S.extra.hourTo) return;
    (byDay[h.day] = byDay[h.day] || []).push(h);
  });
  let keys = Object.keys(byDay).sort();
  if (!isSim()) keys = keys.slice(0, MODES[S.mode].days);
  else keys = keys.slice(1);   // erster Tag ist nur Vorlauf für den Windverlauf
  const days = keys.map(k => ({ key: k, hours: byDay[k], best: bestWindow(byDay[k]) }));
  days.forEach(d => { d.greenHours = d.hours.filter(h => h.score.level === 0).length; d.bestLevel = mn(...d.hours.map(h => h.score.level)); });
  return { hours, days };
}
function bestWindow(hours) {
  const nowKey = isSim() ? "" : nowLocalKey();
  for (const lv of [0, 1]) {
    let best = null, cur = null;
    hours.forEach(h => {
      if (h.score.level === lv && h.t >= nowKey) cur = cur ? { ...cur, to: h.hour } : { from: h.hour, to: h.hour, level: lv };
      else cur = null;
      if (cur && (!best || cur.to - cur.from > best.to - best.from)) best = { ...cur };
    });
    if (best) return best;
  }
  return null;
}

/* ============================================================
   Format & Zeit
   ============================================================ */
const DIRS = ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const compassName = d => DIRS[Math.round((d % 360) / 22.5) % 16];
function fmt(v, unit) {
  if (v == null) return "–";
  const n = unit === "mm/h" || unit === "hPa" ? (Math.round(v * 10) / 10).toLocaleString("de-AT") : Math.round(v).toLocaleString("de-AT");
  return unit ? `${n} ${unit}` : n;
}
const TZF = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false });
const localKey = d => TZF.format(d).replace(" ", "T").slice(0, 13) + ":00";
const nowLocalKey = () => localKey(new Date());
function dayParts(key) {
  const d = new Date(key + "T12:00:00");
  return { wd: d.toLocaleDateString("de-AT", { weekday: "short" }), wdl: d.toLocaleDateString("de-AT", { weekday: "long" }), dm: d.toLocaleDateString("de-AT", { day: "numeric", month: "numeric" }), dow: (d.getDay() + 6) % 7, dnum: d.getDate() };
}
function dayName(idx, key) {
  if (isSim()) { const p = dayParts(key); return `${p.wd} ${p.dm}`; }
  return ["Heute", "Morgen", "Übermorgen"][idx] || dayParts(key).wdl;
}
const LEVEL_TXT = ["fliegbar", "grenzwertig", "nicht fliegbar"];
const lvClass = l => l == null ? "lx" : "l" + l;
const keyOf = (day, hour) => `${day}T${String(hour).padStart(2, "0")}:00`;
const prevDay = key => { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() - 1); return dateStr(d); };

/* ============================================================
   Zustand
   ============================================================ */
let DATA = { fc: null, foehn: null, live: null, hist: null, simFc: null, simFoehn: null, simHist: null, fetchedAt: null, errors: {} };
let EVAL = {};
let SEL = { dayIdx: 0, hour: null };
let SIM_LOADING = false;
const site = () => SITES.find(s => s.id === S.tab);
const curDay = () => { const ev = EVAL[S.tab]; return ev && (ev.days[SEL.dayIdx] || ev.days[0]); };

/* ============================================================
   Steuerung: Ansicht + Pilotenlevel + Erklärung
   ============================================================ */
function renderControls() {
  const el = document.getElementById("controls");
  const custom = S.level === "custom";
  const idx = custom ? S.levelBase : S.level;
  const L = LEVELS[idx];
  const open = el.querySelector("details")?.open ? "open" : "";
  el.innerHTML = `
    <div class="seg" role="group" aria-label="Ansicht">${Object.entries(MODES).map(([k, m]) => `<button type="button" data-mode="${k}" aria-pressed="${S.mode === k}">${m.label}</button>`).join("")}</div>
    <div class="seg two" role="group" aria-label="Flugart">${Object.entries(FLIGHTS).map(([k, f]) => `<button type="button" data-flight="${k}" aria-pressed="${S.flight === k}">${f.label}</button>`).join("")}</div>
    <div>
      <div class="level-top"><span class="label">Pilotenlevel</span><b>${custom ? "Eigene Werte" : L.name}${custom ? `<small>basiert auf ${L.name}</small>` : ""}</b></div>
      <input type="range" id="level-range" min="0" max="3" step="1" value="${idx}" aria-label="Pilotenlevel" aria-valuetext="${L.name}">
      <div class="level-ticks">${LEVELS.map((l, i) => `<span class="${i === idx ? "on" : ""}">${l.name}</span>`).join("")}</div>
    </div>
    <details class="explain" ${open}>
      <summary>Welche Werte gelten gerade?</summary>
      <div class="explain-body">
        <div>${custom ? "Du hast Grenzwerte in den Einstellungen angepasst." : L.desc}</div>
        <table class="lim-table">
          <thead><tr><th>Messgröße</th><th>grün bis</th><th>rot über</th></tr></thead>
          <tbody>${PARAMS.map(p => {
            const l = S.limits[p.key], u = p.unit ? " " + p.unit : "";
            return `<tr><td>${p.label}${p.invert ? " ↓" : ""}</td><td class="g">${p.invert ? "≥ " : ""}${l.g}${u}</td><td class="r">${p.invert ? "< " : ""}${l.r}${u}</td></tr>`;
          }).join("")}</tbody>
        </table>
        <ul class="rules">
          <li><b>Rot</b>, sobald ein einziger Wert rot ist, die Windrichtung nicht passt oder der Startplatz gesperrt ist.</li>
          <li><b>Grün</b> nur, wenn Wind, Böen, Föhn und Richtung grün sind und die gelben Werte insgesamt wenig wiegen (gewichteter Score unter 15 %).</li>
          <li><b>Sonst gelb.</b> Sind ICON-D2 und ICON-CH2 bei den Böen mehr als ${S.extra.modelSpread} km/h uneinig, wird die Stunde eine Stufe schlechter.</li>
          <li><b>Flugart ${FLIGHTS[S.flight].short}:</b> ${S.flight === "hf"
            ? "Höhenwind 700 hPa (ca. 3000 m) zählt bei Starts unter 1800 m höchstens gelb, weil du in Geländenähe darunter fliegst. Bei höheren Starts voll. Starke Thermik zählt höchstens gelb."
            : `Höhenwind 700 hPa kann rot machen. Thermik erwünscht: Grenzschicht ab ${XC.blhGood} m und Basis ab ${XC.baseGood} m über Start sind grün, darunter gelb („kaum Thermik“).`}</li>
          <li><b>Modell-Check:</b> Lag das Modell in den letzten gemessenen Stunden mehrfach bei der Richtung daneben, zählt die Modell-Richtung für die nächsten 12 Stunden höchstens gelb (Pfeil mit Fragezeichen).</li>
          <li><b>Messung schlägt Modell:</b> Für vergangene Stunden und jetzt nimmt das Dashboard Wind und Richtung von der zugeordneten Messstation (z. B. Pfinnalm für die Spielalm), wo es eine gibt. In der Tabelle mit Punkt markiert.</li>
          <li><b>Anfänger/Fortgeschrittene:</b> grün nur, wenn kein sicherheitsrelevanter Wert gelb ist (Wind, Böen, Föhn, Gewitter, Regen, Basis, Sicht, Lee, Front).</li>
          <li><b>Lee:</b> Kommt der Höhenwind (1500 m, bei Starts ab 1800 m 3000 m) von hinten, wird es gelb ab ${10 + 5 * levelIdx()} km/h und rot ab ${20 + 5 * levelIdx()} km/h.</li>
          <li><b>Puffer:</b> Eine Stunde vor Gewitter, Regen, Föhn oder Front ist es nicht mehr grün. Außerdem zählen Sicht, Gewitter im Modell und Druckanstieg (Front).</li>
          <li><b>Böigkeit</b> zählt erst, wenn die Böen über ${S.limits.gust.g} km/h liegen.</li>
          <li><b>Richtung:</b> optimaler Sektor grün, fliegbarer Sektor gelb, sonst rot. Unter ${S.extra.calmWind} km/h zählt die Richtung nicht.</li>
          <li><b>Föhn:</b> ${FOEHN.combine === "max" ? `das Maximum aus ${FOEHN.primary.label} und ${FOEHN.secondary.label}` : `Druckdifferenz ${FOEHN.primary.label}`}${FOEHN.beginnerRed != null ? `, für Anfänger rot ab ${FOEHN.beginnerRed} hPa` : ""}. Steigt der Föhn in 3 h um 1 hPa, eine Stufe schlechter. ${FOEHN.explain}</li>
          <li>Pro Wert zählt das schlechtere Modell von ICON-D2 und ICON-CH2. Wo ICON-D2 fehlt (ab ca. Tag 3, im 7-Tage-Modus ICON-EU/ECMWF), sind Stunden schraffiert.</li>
          <li><b>Rückblick:</b> echte vergangene Modellläufe (Open-Meteo Historical Forecast), bewertet mit deinen aktuellen Grenzwerten.</li>
        </ul>
      </div>
    </details>`;
  const range = el.querySelector("#level-range");
  range.addEventListener("input", () => {
    const i = +range.value;
    S.level = i; S.levelBase = i; S.limits = presetLimits(i);
    saveSettings(); recompute();
  });
  el.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  el.querySelectorAll("[data-flight]").forEach(b => b.addEventListener("click", () => { S.flight = b.dataset.flight; saveSettings(); recompute(); }));
}

async function setMode(mode) {
  if (S.mode === mode) return;
  S.mode = mode; SEL = { dayIdx: 0, hour: null }; saveSettings();
  if (mode === "week" && DATA.fc && !DATA.fcWeek) { await load(); return; }
  if (mode === "sim" && !DATA.simFc) { await loadSim(); return; }
  recompute();
}

/* ============================================================
   Tabs
   ============================================================ */
function renderTabs() {
  const el = document.getElementById("tabs");
  const nowKey = isSim() ? "" : nowLocalKey();
  el.innerHTML = SITES.map(s => {
    const ev = EVAL[s.id];
    const bestLv = ev ? mn(...ev.days.flatMap(d => d.hours.filter(h => h.t >= nowKey).map(h => h.score.level))) : null;
    const dot = bestLv == null ? "var(--nodata)" : ["var(--go)", "var(--warn)", "var(--stop)"][bestLv];
    return `<button class="tab" role="tab" aria-selected="${s.id === S.tab}" data-tab="${s.id}" title="Beste Stunde im Zeitraum: ${bestLv == null ? "keine Daten" : LEVEL_TXT[bestLv]}">
      <span class="dot" style="background:${dot}"></span>${s.name} <small>${s.area}</small></button>`;
  }).join("");
  el.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    S.tab = b.dataset.tab; SEL.hour = null; saveSettings(); renderAll();
  }));
}

/* ============================================================
   Hero: Urteil, Kompass, Tageskarten bzw. Rückblick-Kalender
   ============================================================ */
/* Bergpanorama: Himmel nach Urteil, Windsack zeigt Modellwind, Gleitschirm nur wenn fliegbar */
const SKY = { 0: ["#2a7fcf", "#8ccff4", "#ffe3a8"], 1: ["#5b82a3", "#b0c5d3", "#eed9b2"], 2: ["#37434f", "#6f7c87", "#a3acb3"], x: ["#44576a", "#8797a4", "#c2cbd2"] };
const ridgeY = (seed, base, amp, x) => base - amp * (0.55 * Math.sin(x / 53 + seed) + 0.3 * Math.sin(x / 23 + seed * 2.1) + 0.15 * Math.sin(x / 9 + seed * 3.7));
function ridgePath(seed, base, amp) {
  let d = "M0 220";
  for (let x = 0; x <= 400; x += 5) d += ` L${x} ${ridgeY(seed, base, amp, x).toFixed(1)}`;
  return d + " L400 220 Z";
}
const cloudPath = (x, y, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="-12" cy="2" rx="14" ry="8"/><ellipse cx="4" cy="-4" rx="16" ry="11"/><ellipse cx="18" cy="3" rx="12" ry="7"/><rect x="-24" y="2" width="52" height="8" rx="4"/></g>`;
function sceneSVG(level, h, s) {
  const sky = SKY[level ?? "x"];
  const w = h && h.windLaunch != null ? h.windLaunch : 0;
  const sign = h && h.dir != null && Math.sin((h.dir + 180) * Math.PI / 180) < 0 ? -1 : 1;   // Strömung nach Ost = rechts
  const seed = [...s.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 10;
  const sx = 318, sy = ridgeY(seed + 7, 186, 22, sx);
  const droop = 84 - Math.min(w, 22) / 22 * 78;   // schlaff bis waagrecht
  let svg = `<svg class="scene" viewBox="0 0 400 214" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".62" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>
    <radialGradient id="sun"><stop offset="0" stop-color="#fff6d8"/><stop offset=".45" stop-color="#ffd27a"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="214" fill="url(#sky)"/>`;
  if (level === 0 || level === 1) svg += `<circle cx="336" cy="46" r="${level === 0 ? 46 : 34}" fill="url(#sun)" opacity="${level === 0 ? 1 : .6}"/>`;
  if (level === 2 || (h && h.lowCloud > 60)) svg += `<g fill="#e9eef2" opacity="${level === 2 ? .8 : .6}">${cloudPath(70, 40, 1.1)}${cloudPath(220, 28, .9)}${cloudPath(330, 58, 1.2)}</g>`;
  if (h && h.rain >= 0.2) svg += `<g stroke="#dfe7ee" stroke-width="1" opacity=".7">${Array.from({ length: 26 }, (_, i) => { const x = (i * 37) % 400, y = 60 + (i * 23) % 90; return `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + 10}"/>`; }).join("")}</g>`;
  // Windschlieren: Anzahl und Tempo nach Wind
  if (w >= 3) {
    const n = 3 + Math.round(Math.min(w, 30) / 5), dur = Math.max(1.4, 9 - w / 4);
    svg += `<g ${sign < 0 ? 'transform="translate(400 0) scale(-1 1)"' : ""}>` + Array.from({ length: n }, (_, i) => {
      const y = 22 + (i * 29) % 110, len = 18 + Math.min(w, 35) * 1.2, x0 = (i * 137) % 400;
      return `<line class="streak" x1="${x0}" y1="${y}" x2="${x0 + len}" y2="${y}" style="animation-duration:${dur.toFixed(1)}s;animation-delay:${(-i * dur / n).toFixed(2)}s"/>`;
    }).join("") + `</g>`;
  }
  svg += `<path d="${ridgePath(seed + 1, 122, 40)}" fill="#8ea8be" opacity=".85"/>
    <path d="${ridgePath(seed + 4, 152, 34)}" fill="#557189"/>
    <path d="${ridgePath(seed + 7, 186, 22)}" fill="#1f2e3b"/>`;
  // Windsack am Gipfel
  svg += `<g transform="translate(${sx} ${(sy - 30).toFixed(1)})"><line x1="0" y1="0" x2="0" y2="31" stroke="#c9d3db" stroke-width="1.6"/>
    <g transform="scale(${sign} 1) rotate(${droop.toFixed(0)})"><path d="M0 -3.6 L24 -2 L24 2 L0 3.6 Z" fill="#fff"/>
    <path d="M0 -3.6 L6 -3.2 L6 3.2 L0 3.6 Z M12 -2.8 L18 -2.4 L18 2.4 L12 2.8 Z" fill="#e8622c"/></g></g>`;
  // Gleitschirm
  if (level === 0 || level === 1) {
    const gx = level === 0 ? 118 : 160, gy = level === 0 ? 52 : 86;
    svg += `<g class="glider"><g transform="translate(${gx} ${gy}) scale(${sign} 1)">
      <path d="M-26 5 Q0 -13 26 5 Q0 -4 -26 5 Z" fill="#e8622c" stroke="#a83d14" stroke-width=".6"/>
      <path d="M-13 -1.5 L-12 1.6 M0 -4 L0 0.6 M13 -1.5 L12 1.6" stroke="#a83d14" stroke-width=".5"/>
      <g stroke="#1f2e3b" stroke-width=".45"><line x1="-25" y1="5" x2="0" y2="24"/><line x1="-11" y1="1" x2="0" y2="24"/><line x1="11" y1="1" x2="0" y2="24"/><line x1="25" y1="5" x2="0" y2="24"/></g>
      <circle cx="0" cy="26" r="2.8" fill="#1f2e3b"/></g></g>`;
  }
  return svg + `</svg>`;
}
function motto(level, day, future) {
  if (!future.length) return "Tag vorbei.";
  if (level == null) return "Keine Daten.";
  if (level === 0 && future.filter(h => h.score.level === 0).length < 3) return "Nur ein kurzes Fenster.";
  if (level === 0) return levelIdx() <= 1 ? "Laut Modell gut. Am Start prüfen." : ["Ab in die Luft!", "Schirm einpacken!", "Der Startplatz ruft.", "Gute Luft da oben."][day.key.charCodeAt(9) % 4];
  if (level === 1) {
    if (S.flight === "xc" && future.some(h => h.score.grades.blh === 1 && h.blh != null && h.blh < XC.blhGood)) return "Fliegbar, aber kaum Thermik.";
    return "Möglich. Genau hinschauen.";
  }
  const counts = {};
  future.forEach(h => h.score.reasons.forEach(r => { if (r.level === 2) counts[r.key] = (counts[r.key] || 0) + 1; }));
  const PRIO = ["dark", "closed", "foehn", "cape", "li", "rain", "gust", "windLaunch", "spread", "cloud", "windLand", "dir", "w850", "w700", "lee", "blh"];
  const top = Object.entries(counts).sort((a, b) => (PRIO.indexOf(a[0]) + 99) % 99 - (PRIO.indexOf(b[0]) + 99) % 99 || b[1] - a[1])[0];
  return ({ foehn: "Föhn! Heute am Boden bleiben.", rain: "Regen. Der Schirm bleibt trocken.", cloud: "Start steckt in den Wolken.",
    gust: "Zu böig. Groundhandling statt Flug.", spread: "Zu böig. Groundhandling statt Flug.", windLaunch: "Zu viel Wind am Start.",
    dir: "Wind von der falschen Seite.", cape: "Gewittergefahr. Lieber am Boden.", li: "Gewittergefahr. Lieber am Boden.",
    closed: "Bahn oder Startplatz zu.", dark: "Zu wenig Tageslicht.", w850: "Starker Wind in der Höhe.", w700: "Starker Höhenwind." })[top && top[0]] || "Bodentag. Zeit für Groundhandling.";
}
function arc(c, r, a, b) {
  const p = d => [c + r * Math.sin(d * Math.PI / 180), c - r * Math.cos(d * Math.PI / 180)];
  const span = ((b - a) + 360) % 360 || 360;
  const [x1, y1] = p(a), [x2, y2] = p(b);
  return `M${c} ${c} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
}
const dirColor = dg => dg === 0 ? "var(--go)" : dg === 1 ? "var(--warn)" : dg === 2 ? "var(--stop)" : "var(--muted)";
function compassSVG(s, h) {
  const c = 59, r = 52;
  const ls = s.launches || [s], chosen = h && h.score.launch;
  const wedge = l => {
    const full = l.sectorWide && ((l.sectorWide[1] - l.sectorWide[0] + 360) % 360 === 0);
    const dim = chosen && l !== chosen ? .5 : 1;
    const w = !l.sectorWide ? "" : full ? `<circle cx="${c}" cy="${c}" r="${r}" style="fill:var(--warn);opacity:${.18 * dim}"/>` : `<path d="${arc(c, r, l.sectorWide[0], l.sectorWide[1])}" style="fill:var(--warn);opacity:${.22 * dim}"/>`;
    return w + `<path d="${arc(c, r, l.sector[0], l.sector[1])}" style="fill:${l.capYellow && levelIdx() <= 1 ? "var(--warn)" : "var(--go)"};opacity:${.35 * dim}"/>`;
  };
  const wide = ls.map(wedge).join("");
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const len = i % 9 === 0 ? 7 : 3.5, rad = i * 10 * Math.PI / 180;
    return `<line x1="${c + (r - len) * Math.sin(rad)}" y1="${c - (r - len) * Math.cos(rad)}" x2="${c + r * Math.sin(rad)}" y2="${c - r * Math.cos(rad)}" style="stroke:var(--muted);stroke-width:${i % 9 === 0 ? 1.6 : .8}"/>`;
  }).join("");
  const labels = ["N", "O", "S", "W"].map((n, i) => {
    const rad = i * Math.PI / 2;
    return `<text x="${c + (r - 15) * Math.sin(rad)}" y="${c - (r - 15) * Math.cos(rad) + 4}" text-anchor="middle" style="font:700 11px var(--font-data);fill:var(--muted)">${n}</text>`;
  }).join("");
  let arrow = "", center = "";
  if (h && h.dir != null) {
    const col = h.score.dirGrade === -1 ? "var(--ink)" : dirColor(h.score.dirGrade);
    arrow = `<g transform="rotate(${h.dir + 180} ${c} ${c})"><path d="M${c} ${c - 40} L${c + 9} ${c - 22} L${c + 3} ${c - 22} L${c + 3} ${c + 34} L${c - 3} ${c + 34} L${c - 3} ${c - 22} L${c - 9} ${c - 22} Z" style="fill:${col};stroke:var(--surface);stroke-width:1.5"/></g>`;
    center = `<circle cx="${c}" cy="${c}" r="15" style="fill:var(--surface);stroke:var(--line)"/>
      <text x="${c}" y="${c + 4}" text-anchor="middle" style="font:700 12px var(--font-data);fill:var(--ink)">${Math.round(h.windLaunch)}</text>`;
  }
  return `<svg class="compass" viewBox="0 0 118 118" role="img" aria-label="Startsektor ${s.sectorLabel}${h && h.dir != null ? ", Wind aus " + compassName(h.dir) : ""}">
    <circle cx="${c}" cy="${c}" r="${r}" style="fill:var(--surface-2);stroke:var(--line)"/>
    ${wide}
    ${ticks}${labels}${arrow}${center}
  </svg>`;
}

function renderHero() {
  const s = site(), el = document.getElementById("hero"), ev = EVAL[s.id];
  el.classList.toggle("sim", isSim());
  if (!ev || !ev.days.length) {
    const err = isSim() ? DATA.errors.sim : DATA.errors.fc;
    el.innerHTML = err ? `<div class="err">Daten nicht geladen: ${err}. Tippe auf Neu laden.</div>`
      : `<div class="muted">${isSim() ? "Lade Rückblick der letzten " + S.extra.simDays + " Tage…" : "Lade Prognose…"}</div>`;
    return;
  }
  const nowKey = isSim() ? "" : nowLocalKey();
  const day = curDay();
  const nowHour = !isSim() && SEL.dayIdx === 0 ? ev.hours.find(h => h.t === nowLocalKey()) : null;
  const ref = (SEL.hour != null && day.hours.find(h => h.hour === SEL.hour)) || nowHour || (day.best && day.hours.find(h => h.hour === day.best.from)) || day.hours[Math.floor(day.hours.length / 2)];

  const future = day.hours.filter(h => h.t >= nowKey);
  const dayBest = mn(...future.map(h => h.score.level));
  const title = future.length === 0 ? "vorbei" : dayBest == null ? "keine Daten" : LEVEL_TXT[dayBest];
  let sub = day.best ? `${day.best.level === 0 ? "Grünes" : "Gelbes"} Fenster <b class="mono">${day.best.from}–${day.best.to + 1} Uhr</b>` : "Kein Fenster an diesem Tag.";
  if (!isSim()) {
    const nextGreen = ev.days.findIndex(d => d.best && d.best.level === 0);
    if (nextGreen >= 0 && nextGreen !== SEL.dayIdx) sub += ` · ${dayName(nextGreen, ev.days[nextGreen].key)} grün ${ev.days[nextGreen].best.from}–${ev.days[nextGreen].best.to + 1}`;
    else if (nextGreen < 0) sub += ` · In ${ev.days.length} Tagen kein grünes Fenster.`;
  } else {
    const greenDays = ev.days.filter(d => d.greenHours > 0).length;
    sub += ` · ${greenDays} von ${ev.days.length} Tagen mit grünen Stunden`;
  }

  const lvl = future.length ? dayBest : null;
  el.innerHTML = `
    <div class="scene-wrap">${sceneSVG(lvl, ref, s)}
      <div class="scene-txt">
        <div class="eyebrow"><b>${s.name}</b> · ${s.elev} m · Start ${s.sectorLabel}${isSim() ? `<span class="simtag">Rückblick</span>` : ""}</div>
        <div class="motto">${motto(lvl, day, future)}</div>
        <span class="pill ${lvClass(lvl)}">${dayName(SEL.dayIdx, day.key)} · ${title}</span>
      </div>
    </div>
    <div class="hero-head">
      <div class="txt"><div class="verdict-sub">${sub}</div>${ref && ref.score.launch ? `<div class="hint"><b>Passender Start ${ref.hour} Uhr:</b> ${ref.score.launch.name} (${ref.score.launch.sectorLabel})</div>` : ""}<div class="hint">Windsack und Pfeil: Modellwind ${ref ? ref.hour + " Uhr" : ""}${ref && ref.windLaunch != null ? ", " + Math.round(ref.windLaunch) + " km/h aus " + compassName(ref.dir ?? 0) : ""}</div></div>
      ${compassSVG(s, ref)}
    </div>
    ${isSim() ? renderCalendar(ev) : renderDayCards(ev, nowKey)}
    ${renderBriefing(s, ev, day)}
    <div class="legend"><span><i style="background:var(--go);opacity:.6"></i>optimaler Sektor</span>${s.sectorWide ? `<span><i style="background:var(--warn);opacity:.5"></i>fliegbarer Sektor</span>` : ""}</div>`;
  el.querySelectorAll("[data-day]").forEach(b => b.addEventListener("click", () => {
    SEL = { dayIdx: +b.dataset.day, hour: null }; renderHero(); renderHours(); renderModules();
  }));
}
/* Kurz-Briefing: Lage, Fenster, Achtung, Thermik – aus den bewerteten Stunden zusammengesetzt */
function buildBriefing(s, ev, day) {
  const nowKey = isSim() ? "" : nowLocalKey();
  const H = day.hours.filter(h => h.t >= nowKey);
  if (!H.length) return null;
  const L = S.limits, hrs = hourRanges;
  const at = (pred) => H.filter(pred).map(h => h.hour);
  const F = FOEHN, fMax = mx(...H.map(h => h.foehn)), fMin = mn(...H.map(h => h.foehn));
  const fPeak = H.find(h => h.foehn === fMax);
  const next = ev.days[ev.days.indexOf(day) + 1];
  const nextF = next ? mx(...next.hours.map(h => h.foehn)) : null;
  // Lage
  let lage = [];
  if (fMax != null && fMax >= L.foehn.r) lage.push(`${F.posName} mit bis zu ${fMax.toLocaleString("de-AT")} hPa (${F.primary.label}) ab etwa ${fPeak.hour} Uhr`);
  else if (fMax != null && fMax >= L.foehn.g) lage.push(`leichter ${F.posName}-Druck (${fMax.toLocaleString("de-AT")} hPa)`);
  else if (fMin != null && fMin <= -L.foehn.r) lage.push(`${F.negName}`);
  const w7 = mx(...H.map(h => h.w700)), w7h = H.find(h => h.w700 === w7);
  if (w7 != null && w7 > L.w700.g) lage.push(`kräftiger Höhenwind${w7h && w7h.d700 != null ? " aus " + compassName(w7h.d700) : ""} (bis ${Math.round(w7)} km/h auf ~3000 m)`);
  const rainH = at(h => h.rain != null && h.rain >= L.rain.r);
  if (rainH.length) lage.push(`Regen ab ${rainH[0]} Uhr`);
  const storm = at(h => stormRisk(h) >= 2);
  if (storm.length) lage.push(`Gewitterneigung ab ${storm[0]} Uhr`);
  if (!lage.length) lage.push("kein Föhnsignal im Druckgradienten, kein Niederschlag");
  if (nextF != null && nextF >= L.foehn.r && !(fMax >= L.foehn.r)) lage.push(`morgen ${F.posName} (bis ${nextF.toLocaleString("de-AT")} hPa)`);
  // Fenster
  const b = day.best;
  let fenster = b ? `${b.level === 0 ? "Grün" : "Gelb"} von ${b.from} bis ${b.to + 1} Uhr.` : "Kein fliegbares Fenster.";
  if (b) {
    const after = H.find(h => h.hour === b.to + 1);
    const why = after && after.score.reasons.find(r => r.level >= 1);
    if (why) fenster += ` Danach: ${why.label} (${why.value}).`;
  }
  // Achtung: wichtigste Einschränkungen mit Uhrzeit
  const achtung = [];
  const gustH = at(h => h.gust != null && h.gust > L.gust.g);
  if (gustH.length) achtung.push(`Böen über ${L.gust.g} km/h ${hrs(gustH)} (bis ${Math.round(mx(...H.map(h => h.gust)))} km/h)`);
  const dirBad = at(h => h.score.grades.dir === 2);
  if (dirBad.length) achtung.push(`Wind von der falschen Seite ${hrs(dirBad)}`);
  const lowCloud = at(h => h.cloud != null && h.cloud < L.cloud.r);
  if (lowCloud.length) achtung.push(`Start in den Wolken ${hrs(lowCloud)}`);
  const lee = H.find(h => h.score.grades.lee >= 1);
  if (lee) achtung.push(lee.score.reasons.find(r => r.key === "lee").label);
  if (H.some(h => h.dirSuspect)) achtung.push("Modell lag heute bei der Windrichtung daneben: vor Ort Windsack prüfen");
  // Thermik
  const blhMax = mx(...H.map(h => h.blh)), blhH = H.find(h => h.blh === blhMax);
  let thermik = null;
  const blhSrc = H.some(h => h.burnair) ? "Thermikobergrenze laut Burnair" : "Grenzschicht (grob, GFS)";
  if (blhMax != null) thermik = blhMax < 500 ? `${blhSrc} niedrig: kaum Durchmischung. Bei Föhn oder Inversion kann es trotzdem turbulent sein.` : `${blhSrc} bis ca. ${Math.round(blhMax / 100) * 100} m über Grund um ${blhH.hour} Uhr${blhMax >= 1500 && S.flight === "hf" && levelIdx() <= 1 ? ", mittags für Anfänger eher ruppig" : ""}.`;
  // Kopfzeile
  const lv = mn(...H.map(h => h.score.level));
  const nGreen = H.filter(h => h.score.level === 0).length, nYellow = H.filter(h => h.score.level === 1).length;
  const kind = nGreen >= 4 ? "Fliegbarer Tag" : nGreen ? "Kurzes Fenster" : nYellow ? "Grenzwertiger Tag" : "Kein Flugtag";
  const head = kind + ": " + lage.slice(0, 3).join(", ") + ".";
  const src = [H.some(h => h.burnair) ? "Burnair" : "Open-Meteo", H.some(h => h.measured) ? "Messung " + STATION_NAME[s.measureStation] : null].filter(Boolean).join(" + ");
  return { lv, head, fenster, achtung, thermik, src };
}
function renderBriefing(s, ev, day) {
  const B = buildBriefing(s, ev, day);
  if (!B) return "";
  const head = B.head.charAt(0).toUpperCase() + B.head.slice(1);
  return `<div class="brief ${lvClass(B.lv)}">
    <div class="brief-head"><span class="label">Briefing · ${dayName(SEL.dayIdx, day.key)}</span><span class="hint">${B.src}</span></div>
    <p>${head}</p>
    <dl>
      <dt>Fenster</dt><dd>${B.fenster}</dd>
      ${B.achtung.length ? `<dt>Achtung</dt><dd>${B.achtung.slice(0, 4).join(" · ")}</dd>` : ""}
      ${B.thermik ? `<dt>Thermik</dt><dd>${B.thermik}</dd>` : ""}
    </dl>
  </div>`;
}
function renderDayCards(ev, nowKey) {
  return `<div class="daycards">${ev.days.map((d, i) => {
    const p = dayParts(d.key), b = d.best;
    return `<button class="daycard" data-day="${i}" aria-pressed="${i === SEL.dayIdx}">
      <span class="dn">${dayName(i, d.key).replace("Übermorgen", "Überm.")}</span><span class="dd">${p.wd} ${p.dm}</span>
      <span class="win ${b ? "l" + b.level : "l2"}">${b ? `${b.from}–${b.to + 1} h` : "kein Fenster"}</span>
      <span class="miniband">${d.hours.map(h => `<i class="${lvClass(h.score.level)}${h.t < nowKey ? " past" : ""}${h.lowConf ? " lowconf" : ""}"></i>`).join("")}</span>
    </button>`;
  }).join("")}</div>`;
}
function renderCalendar(ev) {
  const lead = dayParts(ev.days[0].key).dow;
  const cells = Array.from({ length: lead }, () => `<span></span>`).concat(ev.days.map((d, i) => {
    const p = dayParts(d.key);
    return `<button data-day="${i}" class="${lvClass(d.bestLevel)}" aria-pressed="${i === SEL.dayIdx}" aria-label="${p.wd} ${p.dm}: ${d.bestLevel == null ? "keine Daten" : LEVEL_TXT[d.bestLevel]}, ${d.greenHours} grüne Stunden">
      <b>${p.dnum}</b><span class="gh">${d.greenHours ? d.greenHours + "h" : "·"}</span></button>`;
  }));
  const top = ev.days.map((d, i) => ({ d, i })).filter(x => x.d.greenHours > 0).sort((a, b) => b.d.greenHours - a.d.greenHours).slice(0, 4);
  return `<div class="cal">${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(w => `<span class="wd">${w}</span>`).join("")}${cells.join("")}</div>
    <div class="label">Beste Tage im Rückblick</div>
    <div class="toplist">${top.length ? top.map(x => { const p = dayParts(x.d.key); return `<button data-day="${x.i}">${p.wd} ${p.dm} · ${x.d.greenHours} h grün</button>`; }).join("") : `<span class="hint">Kein grüner Tag in diesem Zeitraum. Probier ein höheres Pilotenlevel.</span>`}</div>`;
}

/* ============================================================
   Stundentabelle (Windguru-Stil)
   ============================================================ */
function arrowSVG(dir, col = "var(--ink)") {
  if (dir == null) return "–";
  return `<svg class="arrow" viewBox="0 0 24 24" aria-label="aus ${compassName(dir)}"><g transform="rotate(${dir + 180} 12 12)"><path d="M12 2 L17.5 11 L13.6 11 L13.6 22 L10.4 22 L10.4 11 L6.5 11 Z" style="fill:${col}"/></g></svg>`;
}
const ROWS = [
  { k: "dir",        label: "Richtung" },
  { k: "windLaunch", label: "Wind", f: v => Math.round(v) },
  { k: "gust",       label: "Böen", f: v => Math.round(v) },
  { k: "windLand",   label: "Landung", f: v => Math.round(v) },
  { k: "w850",       label: "850 hPa", f: v => Math.round(v) },
  { k: "cloud",      label: "Basis km", f: v => v > 4000 ? "hoch" : (v / 1000).toLocaleString("de-AT", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) },
  { k: "cape",       label: "CAPE", f: v => v >= 1000 ? (v / 1000).toFixed(1) + "k" : Math.round(v) },
  { k: "rain",       label: "Regen", f: v => v < 0.05 ? "·" : v.toLocaleString("de-AT", { maximumFractionDigits: 1 }) },
  { k: "foehn",      label: "Föhn hPa", f: v => v.toLocaleString("de-AT", { maximumFractionDigits: 1 }) },
];
function renderHours() {
  const s = site(), el = document.getElementById("hours"), ev = EVAL[s.id];
  if (!ev || !ev.days.length) { el.innerHTML = `<h2>Stunden</h2><div class="muted">Lade…</div>`; return; }
  const day = curDay(), nowKey = isSim() ? "" : nowLocalKey(), p = dayParts(day.key);
  const cell = (h, inner, cls) => {
    const c = ["c", cls]; if (h.t < nowKey) c.push("past"); if (SEL.hour === h.hour) c.push("sel");
    return `<button class="${c.join(" ")}" data-hour="${h.hour}" aria-label="${h.hour} Uhr">${inner}</button>`;
  };
  let grid = `<div class="rh"></div>` + day.hours.map(h => `<div class="hh${h.t === nowLocalKey() && !isSim() ? " now" : ""}">${h.hour}</div>`).join("");
  grid += `<div class="rh">Ampel</div>` + day.hours.map(h => cell(h, "", `amp ${lvClass(h.score.level)}${h.lowConf ? " lowconf" : ""}`)).join("");
  if (s.launches) grid += `<div class="rh">Start</div>` + day.hours.map(h => cell(h, h.score.launch ? h.score.launch.short : "–", h.score.dirGrade == null || h.score.dirGrade < 0 ? "" : "t" + h.score.dirGrade)).join("");
  ROWS.forEach(r => {
    grid += `<div class="rh">${r.label}</div>` + day.hours.map(h => {
      if (r.k === "dir") return cell(h, arrowSVG(h.dir, h.dirSuspect && h.score.dirGrade === 2 ? "var(--warn)" : dirColor(h.score.dirGrade)), h.measured ? "meas" : h.dirSuspect ? "suspect" : h.burnair ? "ba" : "");
      const v = h[r.k], g = h.score.grades[r.k];
      return cell(h, v == null ? "–" : r.f(v), g == null ? "" : "t" + g);
    }).join("");
  });
  const sel = SEL.hour != null ? day.hours.find(h => h.hour === SEL.hour) : null;
  el.innerHTML = `<h2>${dayName(SEL.dayIdx, day.key)}${isSim() ? "" : `, ${p.wd} ${p.dm}`} <small>Spalte antippen für Gründe</small></h2>
    <div class="table-scroll"><div class="htable" style="--cols:${day.hours.length}">${grid}</div></div>
    <div class="legend"><span>Wind, Böen, 850 hPa in km/h</span><span>Basis = Wolkenbasis über Start, – = wolkenlos</span>${site().measureStation ? `<span>• = gemessen (${STATION_NAME[site().measureStation] || ""})</span>` : ""}${DATA.burnair ? `<span><b style="color:var(--sim)">b</b> = Burnair</span>` : ""}<span><i style="background:repeating-linear-gradient(135deg,var(--warn) 0 3px,var(--surface) 3px 5px)"></i>unsicher</span></div>
    ${sel ? renderDetail(sel) : ""}`;
  el.querySelectorAll(".c[data-hour]").forEach(c => c.addEventListener("click", () => {
    const hr = +c.dataset.hour;
    SEL.hour = SEL.hour === hr ? null : hr;
    renderHours(); renderHero(); renderModules(["foehn", "aloft", "profile", "map3d"]);
  }));
}
function renderDetail(h) {
  const sc = h.score, extra = [];
  if (sc.bumped) extra.push(`Modelle uneinig bei Böen (${Math.round(h.modelGustDiff)} km/h): eine Stufe schlechter.`);
  if (h.burnair) extra.push(`Wind, Böen, Basis, Thermik und Regen aus Burnair (${h.burnair.toUpperCase()})${h.baBelow ? ", Start liegt unter dem Modellgelände: unterste Modellschicht" : ", Wind auf Starthöhe"}.`);
  if (h.dirSuspect) extra.push(`Modell-Check: Die Windrichtung des Modells lag heute in ${h.dirSuspect} daneben (Vergleich mit ${STATION_NAME[site().measureStation] || "Messung"}). Richtung zählt deshalb höchstens gelb. Vor Ort Windsack und Burnair prüfen.`);
  if (h.measured && h.model) extra.push(`Wind gemessen in ${h.measured}. Modell hätte ${h.model.dir != null ? compassName(h.model.dir) : "–"} ${h.model.windLaunch != null ? Math.round(h.model.windLaunch) : "–"} km/h gesagt.`);
  if (h.lowConf) extra.push("Ohne ICON-D2: Wind aus ICON-CH2 bzw. ICON-EU/ECMWF, Höhenwind aus gröberen Modellen.");
  return `<div class="detail">
    <div class="detail-head"><b>${h.hour}:00 Uhr</b><span class="pill ${lvClass(sc.level)}">${sc.level == null ? "keine Daten" : LEVEL_TXT[sc.level]}</span></div>
    <div>${sc.reasons.map(r => `<div class="row"><span class="st ${lvClass(r.level)}"></span><span>${r.label}</span><span class="v">${r.value ?? "–"}</span><span class="lim">${r.limText}</span></div>`).join("")}</div>
    ${extra.map(t => `<div class="hint">${t}</div>`).join("")}
  </div>`;
}

/* ============================================================
   Module (Registry). Neues Modul: Eintrag hier + MODULE_IDS.
   keep: Inhalt bleibt beim Neuzeichnen stehen (iframes, Bilder), solange Startplatz und Datenstand gleich sind.
   ============================================================ */
const MODULES = {
  live:    { title: "Live am Start", render: renderLive, keep: true, update: bindCamTimelines },
  profile: { title: "Windprofil", render: renderProfile },
  map3d:   { title: "3D-Karte " + R.areaName, render: renderMap3d, keep: "always", update: updateMap },
  history: { title: "Windverlauf", render: renderHistory },
  foehn:   { title: "Föhn-Barometer", render: renderFoehn },
  aloft:   { title: "Höhenwind & Gewitter", render: renderAloft },
  site:    { title: "Startplatz-Info", render: renderSiteInfo },
  links:   { title: "Links", render: renderLinks },
};
function renderModules(only) {
  const el = document.getElementById("modules"), s = site();
  const wanted = S.order.filter(id => S.modules[id] && MODULES[id]);
  [...el.children].forEach(c => { if (!wanted.includes(c.dataset.mod)) c.remove(); });
  wanted.forEach((id, i) => {
    let sec = el.querySelector(`[data-mod="${id}"]`);
    if (!sec) { sec = document.createElement("section"); sec.className = "card"; sec.dataset.mod = id; }
    if (el.children[i] !== sec) el.insertBefore(sec, el.children[i] || null);
    if (only && !only.includes(id)) return;
    const m = MODULES[id];
    const stamp = m.keep === "always" ? "fix" : s.id + "|" + S.mode + "|" + (DATA.fetchedAt ? +DATA.fetchedAt : 0);
    if (!(m.keep && sec.dataset.stamp === stamp)) {
      try { sec.innerHTML = m.render(s); } catch (e) { sec.innerHTML = `<div class="err">Modul-Fehler: ${e.message}</div>`; console.error(e); }
      sec.dataset.stamp = stamp;
    }
    if (m.update) { try { m.update(sec, s); } catch (e) { console.error(e); } }
  });
}

/* --- Live: Webcams, Holfuy-Widgets, Talstationen --- */
const camURL = u => u + (u.includes("?") ? "&" : "?") + "t=" + Math.floor(Date.now() / 300000);
function renderLive(s) {
  const cams = `<div class="cams${s.cams.length === 1 ? " single" : ""}">${s.cams.map((c, i) =>
    `<a class="cam" href="${c.link}" target="_blank" rel="noopener"><img data-cam="${c.img}" data-cam-idx="${i}" src="${camURL(c.img)}" alt="Webcam ${c.label}" loading="lazy"><span>${c.label}</span><span class="tlbadge" hidden></span></a>`).join("")}</div>`
    + s.cams.map((c, i) => c.archive ? `<div class="camtl" data-tl="${i}">
      <div class="seg" role="group" aria-label="Tag"><button type="button" data-tlday="0" aria-pressed="true">Heute</button><button type="button" data-tlday="1" aria-pressed="false">Gestern</button></div>
      <button type="button" class="playbtn" aria-label="Zeitraffer abspielen"><svg viewBox="0 0 16 16"><path d="M4 2 L14 8 L4 14 Z"/></svg></button>
      <input type="range" aria-label="Webcam-Zeit ${c.label}" min="0" max="0" value="0">
      <span class="tltime">Live</span></div>` : "").join("");
  const widgets = (s.holfuy || []).map(h => `
    <div class="label">Holfuy ${h.label} · heute, 15-min-Werte</div>
    <iframe class="holfuy-frame" title="Holfuy ${h.label}" loading="lazy" src="https://widget.holfuy.com/?station=${h.id}&su=km/h&t=C&lang=de&mode=average&avgrows=32"></iframe>`).join("");
  const more = s.holfuy && s.holfuy.length ? `<a href="https://holfuy.com/de/weather/${s.holfuy[0].id}" target="_blank" rel="noopener">Holfuy öffnen</a>` : (s.liveLink ? `<a href="${s.liveLink.u}" target="_blank" rel="noopener">${s.liveLink.t}</a>` : "");
  return `<h2>Live am Start <small>${more}</small></h2>
    ${isSim() ? `<div class="flag sim">Rückblick aktiv: Webcams und Messwerte zeigen trotzdem jetzt.</div>` : ""}
    ${cams}${widgets}${renderStations()}`;
}
/* Webcam-Zeitregler: 10-min-Slots, Bild aus dem Holfuy-Archiv, Zeitraffer per Play */
function camSlots(arch, dayOffset) {
  const d = new Date(Date.now() - dayOffset * 864e5), date = dateStr(d), out = [];
  const nowKey = localKey(new Date()), nowMin = +nowKey.slice(11, 13) * 60 + new Date().getMinutes();
  for (let m = arch.from * 60; m <= arch.to * 60; m += 10) {
    if (dayOffset === 0 && m > nowMin - 12) break;   // jüngstes Archivbild hängt ca. 10 min nach
    out.push({ date, h: Math.floor(m / 60), m: m % 60 });
  }
  return out;
}
function loadArchiveImg(arch, slot) {
  const pad = n => String(n).padStart(2, "0");
  const tries = arch.type === "fotowebcam"
    ? [`https://www.foto-webcam.eu/webcam/${arch.id}/${slot.date.replace(/-/g, "/")}/${pad(slot.h)}${pad(slot.m)}_la.jpg`]
    : [1, 2, 0, 3].map(o => `${arch.base}${slot.date}_${pad(slot.h)}:${pad(slot.m + o)}.jpg`);
  return new Promise(res => {
    const next = i => {
      if (i >= tries.length) return res(null);
      const im = new Image(); im.onload = () => res(tries[i]); im.onerror = () => next(i + 1); im.src = tries[i];
    };
    next(0);
  });
}
function bindCamTimelines(sec, s) {
  sec.querySelectorAll(".camtl").forEach(tl => {
    if (tl.dataset.bound) return; tl.dataset.bound = "1";
    const idx = +tl.dataset.tl, cam = s.cams[idx], arch = cam.archive;
    const img = sec.querySelector(`img[data-cam-idx="${idx}"]`), badge = img.parentElement.querySelector(".tlbadge");
    const range = tl.querySelector("input"), label = tl.querySelector(".tltime"), play = tl.querySelector(".playbtn");
    let day = 0, slots = [], timer = null, seq = 0;
    const setup = () => {
      slots = camSlots(arch, day);
      range.max = String(slots.length);            // letzter Wert = Live (heute) bzw. Tagesende
      range.value = String(slots.length);
      show();
    };
    const show = async () => {
      const i = +range.value, my = ++seq;
      if (day === 0 && i >= slots.length) {
        delete img.dataset.tl; img.src = camURL(cam.img); label.textContent = "Live"; badge.hidden = true; return;
      }
      const slot = slots[Math.min(i, slots.length - 1)];
      if (!slot) return;
      const t = `${slot.h}:${String(slot.m).padStart(2, "0")}`;
      label.textContent = t; img.dataset.tl = "1";
      const url = await loadArchiveImg(arch, slot);
      if (my !== seq) return;                       // inzwischen weitergeschoben
      if (url) { img.src = url; badge.hidden = false; badge.textContent = (day ? "Gestern " : "") + t; }
      else { badge.hidden = false; badge.textContent = "kein Bild " + t; }
    };
    const stop = () => { clearTimeout(timer); timer = null; play.innerHTML = `<svg viewBox="0 0 16 16"><path d="M4 2 L14 8 L4 14 Z"/></svg>`; play.setAttribute("aria-label", "Zeitraffer abspielen"); };
    const step = async () => {
      let i = +range.value + 1;
      if (i > slots.length - (day === 0 ? 0 : 1)) { stop(); return; }
      range.value = String(i); await show();
      timer = setTimeout(step, 350);
    };
    range.addEventListener("input", () => { stop(); show(); });
    play.addEventListener("click", () => {
      if (timer) { stop(); return; }
      if (+range.value >= slots.length - (day === 0 ? 0 : 1)) range.value = "0";
      play.innerHTML = `<svg viewBox="0 0 16 16"><path d="M4 2 H7 V14 H4 Z M9 2 H12 V14 H9 Z"/></svg>`; play.setAttribute("aria-label", "Zeitraffer anhalten");
      timer = setTimeout(step, 10);
    });
    tl.querySelectorAll("[data-tlday]").forEach(b => b.addEventListener("click", () => {
      stop(); day = +b.dataset.tlday;
      tl.querySelectorAll("[data-tlday]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      setup();
      if (day === 1) { range.value = String(Math.floor(slots.length / 2)); show(); }
    }));
    setup();
  });
}
function renderStations() {
  const L = DATA.live;
  if (DATA.errors.live) return `<div class="err">Messstationen nicht geladen: ${DATA.errors.live}</div>`;
  if (!L) return `<div class="muted">Lade Messstationen…</div>`;
  const lim = S.limits;
  const rows = STATIONS.map(st => {
    const v = L.st[st.id] || {};
    const lv = v.ffx == null ? null : Math.max(grade(v.ff, lim.windLaunch), grade(v.ffx, lim.gust));
    return `<div class="station"><div class="nm"><b>${st.name}</b> <span class="muted mono" style="font-size:11.5px">${st.elev} m</span><small>${st.role}</small></div>
      ${v.dir == null ? `<span class="muted">–</span>` : arrowSVG(v.dir)}
      <div class="v">${v.ff == null ? "–" : Math.round(v.ff)}<small>Mittel</small></div>
      <div class="v"><span class="st ${lvClass(lv)}" style="width:8px;height:8px;margin-right:4px"></span>${v.ffx == null ? "–" : Math.round(v.ffx)}<small>Böe km/h</small></div></div>`;
  }).join("");
  const ws = FOEHN.warnStation, br = L.st[ws.id];
  let flag = "";
  if (br && br.ffx != null) {
    const inDir = br.dir != null && inSector(br.dir, ws.sector);
    if (br.ffx >= 35 || (inDir && br.ffx >= 25)) flag = `<div class="flag stop"><b>Föhnverdacht:</b> ${ws.name} meldet ${Math.round(br.ffx)} km/h Böen aus ${compassName(br.dir || 0)}. ${ws.note}</div>`;
    else if (inDir && br.ffx >= 15) flag = `<div class="flag warn"><b>Beobachten:</b> ${ws.dirLabel} in ${ws.name} mit ${Math.round(br.ffx)} km/h Böen.</div>`;
  }
  const t = L.ts ? new Date(L.ts).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }) : "";
  return `<div class="label">Messstationen ${R.stationLabel} · ${t} Uhr</div><div class="stations">${rows}</div>${flag}`;
}

/* --- Windverlauf: Pfeil-Teppich Vortag / Tag --- */
function renderHistory(s) {
  const ev = EVAL[s.id];
  const head = `<h2>Windverlauf <small>Wann hat die Richtung gepasst?</small></h2>`;
  if (!ev || !ev.days.length) return head + `<div class="muted">Lade…</div>`;
  // Live: gestern + heute. Rückblick: Vortag + gewählter Tag.
  const dayB = isSim() ? curDay().key : nowLocalKey().slice(0, 10);
  const dayA = prevDay(dayB);
  const nameA = isSim() ? dayParts(dayA).wd + " " + dayParts(dayA).dm : "Gestern";
  const nameB = isSim() ? dayParts(dayB).wd + " " + dayParts(dayB).dm : "Heute";
  const H = Array.from({ length: 16 }, (_, i) => i + 6);
  const nowKey = nowLocalKey();
  const A = activeData();
  const hist = A.hist && A.hist[s.historyStation];
  const hourAt = (day, hr) => ev.hours.find(x => x.t === keyOf(day, hr));
  const modelRow = day => H.map(hr => {
    const h = hourAt(day, hr);
    if (!h || h.dir == null) return `<div class="k"></div>`;
    const dg = dirGrade(s, h.dir, h.windLaunch);
    return `<div class="k ${dg === -1 ? "calm" : "d" + dg}" title="${hr} Uhr: ${compassName(h.dir)} ${Math.round(h.windLaunch)} km/h${!isSim() && keyOf(day, hr) > nowKey ? " (Prognose)" : ""}">${arrowSVG(h.dir, dg === -1 ? "var(--muted)" : "var(--ink)")}</div>`;
  }).join("");
  const stationRow = day => H.map(hr => {
    const v = hist && hist[keyOf(day, hr)];
    if (!v) return `<div class="k"></div>`;
    return `<div class="k v${grade(v.ffx, S.limits.gust) ?? 0}" title="${hr} Uhr: ${compassName(v.dir)} ${Math.round(v.ff)} km/h, Böe ${Math.round(v.ffx)}">${arrowSVG(v.dir)}</div>`;
  }).join("");
  const windowText = day => {
    let best = null, cur = null;
    H.forEach(hr => {
      const h = hourAt(day, hr);
      const ok = h && h.dir != null && [0, -1].includes(dirGrade(s, h.dir, h.windLaunch));
      cur = ok ? (cur ? { ...cur, to: hr } : { from: hr, to: hr }) : null;
      if (cur && (!best || cur.to - cur.from > best.to - best.from)) best = { ...cur };
    });
    return best ? `<b class="mono">${best.from}–${best.to + 1} Uhr</b>` : "<b>gar nicht</b>";
  };
  const stName = STATION_NAME[s.historyStation];
  return head + `
    <div style="font-size:13.5px">${nameA} passte die Richtung am Start ${windowText(dayA)}, ${nameB.toLowerCase() === "heute" ? "heute" : nameB} ${windowText(dayB)}.</div>
    <div class="table-scroll"><div class="carpet">
      <div class="rh"></div>${H.map(h => `<div class="hh">${h % 3 === 0 ? h : ""}</div>`).join("")}
      <div class="rh">Start ${nameA}</div>${modelRow(dayA)}
      <div class="rh">Start ${nameB}</div>${modelRow(dayB)}
      <div class="gap"></div>
      <div class="rh">${stName} ${nameA}</div>${stationRow(dayA)}
      <div class="rh">${stName} ${nameB}</div>${stationRow(dayB)}
    </div></div>
    <div class="legend"><span><i style="background:var(--go);opacity:.5"></i>optimal</span><span><i style="background:var(--warn);opacity:.6"></i>fliegbar</span><span><i style="background:var(--stop);opacity:.5"></i>falsche Richtung</span><span><i style="background:var(--calm);opacity:.5"></i>windstill</span><span>Tal: dunkler = böiger</span></div>
    <div class="hint">Start: Modellwerte am Startplatz${isSim() ? "" : ", nach jetzt als Prognose"}. ${stName}: gemessen (${R.stationLabel}), zeigt den Talwind.${s.holfuy && s.holfuy.length ? " Gemessener Verlauf am Start: Holfuy-Tabelle unter „Live am Start“." : ""}</div>
    ${DATA.errors.hist ? `<div class="err">Stationsverlauf nicht geladen: ${DATA.errors.hist}</div>` : ""}`;
}

/* --- Föhn: Tacho + Kurve, schraffiert über Rot-Grenze --- */
function gaugeSVG(v, lim) {
  const c = 75, cy = 80, r = 62, max = Math.max(8, lim.r + 3);
  const ang = x => Math.PI * (1 - Math.min(Math.max(x, 0), max) / max);
  const pt = (x, rr) => [c + rr * Math.cos(ang(x)), cy - rr * Math.sin(ang(x))];
  const band = (a, b, style) => {
    const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r), [x3, y3] = pt(b, r - 14), [x4, y4] = pt(a, r - 14);
    return `<path d="M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r - 14} ${r - 14} 0 0 0 ${x4} ${y4} Z" style="${style}"/>`;
  };
  let needle = "";
  if (v != null) {
    const [nx, ny] = pt(v, r - 4);
    needle = `<line x1="${c}" y1="${cy}" x2="${nx}" y2="${ny}" style="stroke:var(--ink);stroke-width:3;stroke-linecap:round"/><circle cx="${c}" cy="${cy}" r="5" style="fill:var(--ink)"/>`;
  }
  const tick = x => { const [tx, ty] = pt(x, r + 8); return `<text x="${tx}" y="${ty + 3}" text-anchor="middle" style="font:9px var(--font-data);fill:var(--muted)">${x}</text>`; };
  return `<svg class="gauge" viewBox="0 0 150 92" role="img" aria-label="Föhn ${v ?? "–"} hPa">
    <defs><pattern id="hatch-g" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" style="stroke:var(--stop);stroke-width:2"/></pattern></defs>
    ${band(0, lim.g, "fill:var(--go);opacity:.75")}${band(lim.g, lim.r, "fill:var(--warn);opacity:.8")}${band(lim.r, max, "fill:url(#hatch-g)")}
    ${tick(0)}${tick(lim.g)}${tick(lim.r)}${tick(max)}${needle}
  </svg>`;
}
function windowSeries(F) {
  // Live: ganze Prognose. Rückblick: gewählter Tag ±1.
  if (!isSim()) return F;
  const d = curDay(); if (!d) return F;
  const from = prevDay(d.key), to = (() => { const x = new Date(d.key + "T12:00:00"); x.setDate(x.getDate() + 1); return dateStr(x); })();
  const idx = F.time.map((t, i) => [t, i]).filter(([t]) => t.slice(0, 10) >= from && t.slice(0, 10) <= to).map(([, i]) => i);
  return { time: idx.map(i => F.time[i]), bi: idx.map(i => F.bi[i]), lz: idx.map(i => F.lz[i]), byTime: F.byTime };
}
function renderFoehn() {
  const A = activeData(), head = `<h2>Föhn-Barometer <small>${FOEHN.primary.label}</small></h2>`;
  const err = isSim() ? DATA.errors.sim : DATA.errors.foehn;
  if (err) return head + `<div class="err">Föhndaten nicht geladen: ${err}</div>`;
  if (!A.foehn) return head + `<div class="muted">Lade…</div>`;
  const F = windowSeries(A.foehn), day = curDay();
  const key = SEL.hour != null && day ? keyOf(day.key, SEL.hour) : (isSim() && day ? keyOf(day.key, 13) : nowLocalKey());
  const cur = A.foehn.byTime[key] || {}, lim = S.limits.foehn;
  const maxBI = mx(...F.bi), peak = F.bi.indexOf(maxBI);
  return head + `
    <div class="foehn-top">
      ${gaugeSVG(cur.bi, lim)}
      <div style="display:grid;gap:6px">
        <div class="metric"><div class="label">${SEL.hour != null || isSim() ? key.slice(11, 13) + " Uhr" : "Jetzt"}</div><div class="val"><span class="st ${lvClass(grade(cur.bi, lim))}" style="margin-right:6px"></span>${fmt(cur.bi, "")}<small> hPa</small></div></div>
        <div class="hint">${FOEHN.secondary.label} zum Vergleich: <b class="mono">${fmt(cur.lz, "hPa")}</b></div>
      </div>
    </div>
    ${lineChart({ time: F.time, series: [{ vals: F.bi, color: "var(--accent)", width: 2.2 }, { vals: F.lz, color: "var(--muted)", dash: "4 3", width: 1.2 }],
      thresholds: [{ v: lim.g, color: "var(--warn)" }, { v: lim.r, color: "var(--stop)" }], hatchAbove: lim.r })}
    <div class="chart-legend"><span><i style="background:var(--accent)"></i>${FOEHN.primary.label}</span><span><i style="background:var(--muted)"></i>${FOEHN.secondary.label}</span><span><i style="background:repeating-linear-gradient(90deg,var(--stop) 0 2px,transparent 2px 4px)"></i>schraffiert: über ${lim.r} hPa</span></div>
    <div class="hint">Maximum im Zeitraum: <b class="mono">${fmt(maxBI, "hPa")}</b> (${peak >= 0 ? new Date(F.time[peak]).toLocaleString("de-AT", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "–"}). Föhn kann auch unter diesen Werten durchbrechen: Böen in ${FOEHN.warnStation.name} beobachten.</div>`;
}

/* --- Höhenwind & Gewitter --- */
/* [8,9,10,14,15] → "8–11 und 14–16 Uhr" */
function hourRanges(a) {
  if (!a.length) return "";
  const segs = []; let st = a[0], pr = a[0];
  a.slice(1).concat(null).forEach(x => { if (x === pr + 1) { pr = x; return; } segs.push(st === pr ? `${st}` : `${st}–${pr + 1}`); st = pr = x; });
  return (segs.length > 1 ? segs.slice(0, -1).join(", ") + " und " + segs[segs.length - 1] : segs[0]) + " Uhr";
}
/* Klartext-Stufen für die einfache Ansicht */
const levelIdx = () => S.level === "custom" ? (S.levelBase ?? 0) : S.level;
function stormRisk(h) {
  if (h.cape == null && h.li == null) return null;
  const c = h.cape ?? 0, li = h.li ?? 5;
  if (c > S.limits.cape.r || li < S.limits.li.r - 2) return 3;
  if (c > S.limits.cape.g || li < S.limits.li.r) return 2;
  if (c > 100 || li < S.limits.li.g) return 1;
  return 0;
}
const STORM_TXT = ["keins", "gering", "mittel", "hoch"];
const windWord = (v, lim) => v == null ? "–" : v <= lim.g ? "ruhig" : v <= lim.r ? "kräftig" : "stark";
function renderAloft(s) {
  const ev = EVAL[s.id], head = `<h2>Höhenwind & Gewitter <small>${s.name}</small></h2>`;
  if (!ev || !ev.days.length) return head + `<div class="muted">Lade…</div>`;
  const day = curDay(), H = day.hours, L = S.limits, expert = levelIdx() >= 2;
  const st = H.map(stormRisk), stCls = r => r == null ? "" : r === 0 ? "t0" : r === 1 ? "t0" : r === 2 ? "t1" : "t2";
  const cell = (cls, txt) => `<div class="c ${cls}">${txt}</div>`;
  let grid = `<div class="rh"></div>` + H.map(h => `<div class="hh">${h.hour}</div>`).join("");
  grid += `<div class="rh">Wind ~1500 m</div>` + H.map(h => cell(h.w850 == null ? "" : "t" + grade(h.w850, L.w850), h.w850 == null ? "–" : Math.round(h.w850))).join("");
  grid += `<div class="rh">Wind ~3000 m</div>` + H.map(h => cell(h.w700 == null ? "" : "t" + grade(h.w700, L.w700), h.w700 == null ? "–" : Math.round(h.w700))).join("");
  grid += `<div class="rh">Gewitter</div>` + H.map((h, i) => cell(stCls(st[i]), st[i] == null ? "–" : ["·", "g", "m", "h"][st[i]])).join("");
  grid += `<div class="rh">Basis über Start</div>` + H.map(h => cell(h.cloud == null ? "t0" : "t" + grade(h.cloud, L.cloud, true), h.cloud == null ? "frei" : h.cloud > 4000 ? "hoch" : (h.cloud / 1000).toLocaleString("de-AT", { maximumFractionDigits: 1, minimumFractionDigits: 1 }))).join("");
  const table = `<div class="table-scroll"><div class="htable" style="--cols:${H.length}">${grid}</div></div>
    <div class="legend"><span>Wind in km/h</span><span>Gewitter: · keins, g gering, m mittel, h hoch</span><span>Basis in km, frei = keine tiefen Wolken</span></div>`;
  const expl = aloftExplain(H, st);
  const explHtml = `<div class="explain-box"><div class="label">Was heißt das?</div><ul class="notes">${expl.map(t => `<li>${t}</li>`).join("")}</ul></div>`;
  const help = `<details class="explain"><summary>Begriffe erklärt</summary><div class="explain-body">
      <div><b>Höhenwind:</b> Wind über dem Startplatz. Ist er deutlich stärker als am Start, wird es oben ruppig und auf der Leeseite (windabgewandt) turbulent.</div>
      <div><b>Gewitter:</b> aus CAPE (Energie für aufsteigende Luft) und Lifted Index (Labilität). „Mittel“ heißt: Quellwolken können am Nachmittag in die Höhe schießen. Früh fliegen, Himmel beobachten.</div>
      <div><b>Basis über Start:</b> wie hoch die Wolkenuntergrenze über dem Startplatz liegt. Unter 200 m steckt der Start praktisch in der Wolke.</div>
    </div></details>`;
  if (!expert) {
    return head + explHtml + table + help + `<details class="explain"><summary>Diagramme anzeigen</summary><div class="explain-body">${aloftCharts(s)}</div></details>`;
  }
  return head + explHtml + aloftCharts(s) + `<details class="explain"><summary>Tabelle für ${dayName(SEL.dayIdx, day.key)}</summary><div class="explain-body">${table}</div></details>` + help;
}
/* Klartext: was die Höhen- und Gewitterwerte für den Tag bedeuten */
function aloftExplain(H, st) {
  const out = [], L = S.limits, hrs = hourRanges;
  const strong7 = H.filter(h => h.w700 != null && h.w700 > L.w700.g).map(h => h.hour);
  const strong8 = H.filter(h => h.w850 != null && h.w850 > L.w850.g).map(h => h.hour);
  const max7 = mx(...H.map(h => h.w700)), max8 = mx(...H.map(h => h.w850));
  const s = site(), near8 = Math.abs(s.elev - 1500) < 400, near7 = s.elev >= 1800;
  if (strong8.length) out.push(`Auf ~1500 m weht es ${hrs(strong8)} mit bis zu ${Math.round(max8)} km/h. ${near8 ? "Das ist ungefähr deine Starthöhe: direkt spürbar." : s.elev > 1900 ? "Das liegt unter deinem Start, betrifft vor allem den Landeanflug." : "Das liegt über dem Start, betrifft den Flug."}`);
  else if (max8 != null) out.push(`Auf ~1500 m bleibt es ruhig (max. ${Math.round(max8)} km/h).`);
  if (strong7.length) {
    const d = H.find(h => h.w700 === max7);
    out.push(`Auf ~3000 m kräftiger Wind bis ${Math.round(max7)} km/h${d && d.d700 != null ? " aus " + compassName(d.d700) : ""}. ${near7 ? "Dein Start liegt nahe dieser Höhe: voll relevant, Grate und Leeseiten werden ruppig." : S.flight === "hf" ? "Beim Hike & Fly bist du darunter, aber Leeseiten und Gipfel können ruppig sein." : "Für Thermik- und Streckenflüge oben deutlich windig."}`);
  }
  const risky = H.filter((h, i) => st[i] >= 2).map(h => h.hour);
  const high = H.filter((h, i) => st[i] === 3).map(h => h.hour);
  if (high.length) out.push(`Gewitterrisiko hoch ab ${high[0]} Uhr. Vorher landen, Quellwolken genau beobachten.`);
  else if (risky.length) out.push(`Mittleres Gewitterrisiko ${hrs(risky)}: Quellwolken können schnell wachsen. Lieber früh fliegen.`);
  else out.push("Kein nennenswertes Gewitterrisiko.");
  const low = H.filter(h => h.cloud != null && h.cloud < L.cloud.r).map(h => h.hour);
  if (low.length) out.push(`Wolken sehr tief ${hrs(low)}: Startplatz steckt teils in der Wolke.`);
  return out;
}

function aloftCharts(s) {
  const ev = EVAL[s.id], head = "";
  if (!ev || !ev.days.length) return head + `<div class="muted">Lade…</div>`;
  let H;
  if (isSim()) { const d = curDay().key, a = prevDay(d); H = ev.hours.filter(h => h.day >= a && h.day <= d); }
  else { const today = nowLocalKey().slice(0, 10), last = ev.days[ev.days.length - 1].key; H = ev.hours.filter(h => h.day >= today && h.day <= last); }
  const time = H.map(h => h.t), L = S.limits;
  return head + `
    <div class="label">Wind in km/h</div>
    ${lineChart({ time, series: [
      { vals: H.map(h => h.windLaunch), color: "var(--go)" },
      { vals: H.map(h => h.gust), color: "var(--go)", dash: "3 3", width: 1.3 },
      { vals: H.map(h => h.w850), color: "var(--accent)" },
      { vals: H.map(h => h.w700), color: "var(--ink)", width: 1.3 },
    ], thresholds: [{ v: L.gust.r, color: "var(--stop)" }], hatchAbove: L.gust.r })}
    <div class="chart-legend"><span><i style="background:var(--go)"></i>Start Mittel / Böe</span><span><i style="background:var(--accent)"></i>850 hPa</span><span><i style="background:var(--ink)"></i>700 hPa</span><span><i style="background:var(--stop)"></i>Böen-Limit ${L.gust.r}</span></div>
    <div class="label">CAPE in J/kg (Balken) · Wolkenbasis über Start in m (Linie)</div>
    ${lineChart({ time, series: [], bars: { vals: H.map(h => h.cape), color: "var(--warn)" }, thresholds: [{ v: L.cape.r, color: "var(--stop)" }], hatchAbove: L.cape.r, height: 90 })}
    ${lineChart({ time, series: [{ vals: H.map(h => h.cloud == null ? null : Math.min(h.cloud, 2000)), color: "var(--accent)" }], thresholds: [{ v: L.cloud.g, color: "var(--warn)" }, { v: L.cloud.r, color: "var(--stop)" }], height: 90 })}
    <div class="hint">Wolkenbasis gekappt bei 2000 m, Lücke = wolkenlos. ${isSim() ? "Zeitraum: Vortag und gewählter Tag." : "Höhenwind ICON-D2, danach ICON-EU / ECMWF / GFS."}</div>`;
}

function renderSiteInfo(s) {
  const L = s.landing;
  const sec = s.launches ? s.launches.map(l => `${l.name}: ${l.sector[0]}–${l.sector[1] % 360}°${l.capYellow ? " (für Anfänger gelb)" : ""}`).join(" · ")
    : s.sectorWide ? `optimal ${s.sector[0]}–${s.sector[1] % 360}°, fliegbar ${s.sectorWide[0]}–${s.sectorWide[1]}°${s.sectorSource ? " (" + s.sectorSource + ")" : ""}` : `${s.sector[0]}–${s.sector[1]}°`;
  return `<h2>Startplatz-Info <small>${s.area}</small></h2>
    <ul class="notes">${s.notes.map(n => `<li>${n}</li>`).join("")}</ul>
    <div class="hint">Start ${s.elev} m${s.approx ? " (ungefähr)" : ""} · Richtung ${sec} · ${L.name} ${L.elev} m${L.approx ? " (Lage ungefähr)" : ""}</div>
    <div class="hint"><a href="https://map.burnair.cloud/" target="_blank" rel="noopener">Burnair-Prognose (Startplatz „${s.name}“ suchen)</a> · <a href="https://www.google.com/maps?q=${s.lat},${s.lon}" target="_blank" rel="noopener">Start auf Karte</a> · <a href="https://www.google.com/maps?q=${L.lat},${L.lon}" target="_blank" rel="noopener">Landeplatz auf Karte</a></div>`;
}
function renderLinks(s) {
  const own = (s.holfuy || []).map(h => ({ t: "Holfuy " + h.label, d: "Wind live + Verlauf", u: `https://holfuy.com/de/weather/${h.id}` }));
  return `<h2>Links</h2><div class="links">${own.concat(LINKS).map(l => `<a href="${l.u}" target="_blank" rel="noopener"><b>${l.t}</b><small>${l.d}</small></a>`).join("")}</div>`;
}

/* --- Windprofil: Zeit × Höhe (Windgramm) --- */
function profileHour(s) {
  const ev = EVAL[s.id], day = curDay();
  if (!ev || !day) return null;
  const key = day.key, d = ev.days.find(x => x.key === key);
  if (!d) return null;
  const hr = SEL.hour ?? (!isSim() && SEL.dayIdx === 0 ? +nowLocalKey().slice(11, 13) : d.best ? d.best.from : 13);
  return d.hours.find(h => h.hour === hr) || d.hours[0];
}
function renderProfile(s) {
  const ev = EVAL[s.id], head = `<h2>Windprofil <small>Wind in der Höhe über den Tag</small></h2>`;
  if (!ev || !ev.days.length) return head + `<div class="muted">Lade…</div>`;
  const day = curDay(), H = day.hours, L = S.limits;
  const W = 340, Hh = 250, pl = 52, pr = 6, pt = 10, pb = 18;
  const aMin = Math.max(0, s.landing.elev - 150), aMax = 3400;
  const n = H.length, cw = (W - pl - pr) / n;
  const x = i => pl + cw * (i + 0.5);
  const y = a => pt + (Hh - pt - pb) * (1 - (a - aMin) / (aMax - aMin));
  const levels = [
    { a: s.landing.elev, w: "windLand", d: "dirLand", lim: L.windLand, name: "Landung" },
    { a: s.elev, w: "windLaunch", d: "dir", lim: L.windLaunch, name: "Start" },
    { a: 1500, w: "w850", d: "d850", lim: L.w850, name: "850 hPa" },
    { a: 3000, w: "w700", d: "d700", lim: L.w700, name: "700 hPa" },
  ].sort((p, q) => p.a - q.a);
  // Zeilen mit mind. 24 px Abstand; Druckflächen (Höhe nur ungefähr) weichen nach oben aus
  levels.forEach((l, i) => {
    l.y = y(l.a);
    if (i > 0 && levels[i - 1].y - l.y < 24) l.y = levels[i - 1].y - 24;
  });
  const col = g => g === 0 ? "var(--go)" : g === 1 ? "var(--warn)" : g === 2 ? "var(--stop)" : "var(--muted)";
  let svg = `<svg class="chart profile" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Windprofil">`;
  // Boden bis Landeplatz, Linie Starthöhe
  svg += `<rect x="${pl}" y="${y(s.landing.elev)}" width="${W - pl - pr}" height="${Hh - pb - y(s.landing.elev)}" style="fill:var(--surface-2)"/>`;
  svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(s.elev)}" y2="${y(s.elev)}" style="stroke:var(--accent);stroke-width:1;stroke-dasharray:3 3;opacity:.7"/>`;
  [1000, 2000, 3000].forEach(a => { if (a > aMin) svg += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(a)}" y2="${y(a)}"/>`; });
  levels.forEach(l => svg += `<text x="${pl - 4}" y="${l.y - 1}" text-anchor="end">${l.name}</text><text x="${pl - 4}" y="${l.y + 9}" text-anchor="end" style="font-size:8.5px">${l.name.includes("hPa") ? "≈" : ""}${Math.round(l.a)} m</text>`);
  // Auswahl-Spalte
  const selIdx = SEL.hour != null ? H.findIndex(h => h.hour === SEL.hour) : -1;
  if (selIdx >= 0) svg += `<rect x="${pl + cw * selIdx}" y="${pt}" width="${cw}" height="${Hh - pt - pb}" style="fill:var(--accent);opacity:.1"/>`;
  // Grenzschicht (grob, GFS) als Linie, Wolkenbasis als Wolken
  let blh = "", pen = false;
  H.forEach((h, i) => {
    if (h.blh == null) { pen = false; return; }
    const a = Math.min(aMax, s.landing.elev + h.blh);
    blh += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(a).toFixed(1); pen = true;
  });
  if (blh) svg += `<path d="${blh}" style="fill:none;stroke:var(--warn);stroke-width:1.6;stroke-dasharray:5 3"/>`;
  H.forEach((h, i) => {
    if (h.cloudBase == null || h.cloudBase > aMax) return;
    const cy = y(h.cloudBase);
    svg += `<g style="fill:var(--muted);opacity:.55"><ellipse cx="${x(i) - 4}" cy="${cy}" rx="7" ry="4.5"/><ellipse cx="${x(i) + 4}" cy="${cy - 2}" rx="7" ry="5.5"/><rect x="${x(i) - 11}" y="${cy}" width="22" height="3"/></g>`;
  });
  // Pfeile pro Höhe und Stunde
  levels.forEach(l => H.forEach((h, i) => {
    const w = h[l.w], d = h[l.d];
    if (w == null || d == null) return;
    const g = grade(w, l.lim), sc = 0.55 + Math.min(w, 45) / 45 * 0.6;
    svg += `<g transform="translate(${x(i)} ${l.y}) rotate(${d + 180}) scale(${sc.toFixed(2)})"><path d="M0 -10 L6 -1 L2.2 -1 L2.2 10 L-2.2 10 L-2.2 -1 L-6 -1 Z" style="fill:${col(g)};stroke:var(--surface);stroke-width:.8"/></g>`;
  }));
  // Stundenachse + Ampel-Leiste
  H.forEach((h, i) => {
    svg += `<rect x="${pl + cw * i + 1}" y="${Hh - pb + 3}" width="${cw - 2}" height="4" rx="2" style="fill:${h.score.level == null ? "var(--nodata)" : col(h.score.level)}"/>`;
    if (h.hour % 2 === 0) svg += `<text x="${x(i)}" y="${Hh - 2}" text-anchor="middle">${h.hour}</text>`;
  });
  svg += `</svg>`;
  return head + svg + `
    <div class="chart-legend"><span><i style="background:var(--go)"></i>Pfeil grün/gelb/rot = Wind nach deinen Grenzen, Größe = Stärke</span><span><i style="background:var(--warn)"></i>Grenzschicht (grob, GFS)</span><span><i style="background:var(--muted)"></i>Wolkenbasis</span><span><i style="background:var(--accent)"></i>Starthöhe</span></div>
    <div class="hint">Zeigt Scherung und starken Höhenwind auf einen Blick: Wird der Pfeil nach oben hin rot oder dreht stark, ist Vorsicht angesagt.</div>`;
}

/* --- 3D-Karte (MapLibre + Mapterhorn-Gelände, lädt erst auf Knopfdruck) --- */
const MAPLIBRE_JS = "https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.css";
let MAP = null, MAP_READY = false, MAP_MARKERS = [], MAP_SITE = null;
function loadAsset(tag, attrs) {
  return new Promise((res, rej) => { const el = document.createElement(tag); Object.assign(el, attrs); el.onload = res; el.onerror = () => rej(new Error("Laden fehlgeschlagen: " + (attrs.src || attrs.href))); document.head.appendChild(el); });
}
function renderMap3d() {
  return `<h2>3D-Karte ${R.areaName} <small>Ampel der gewählten Stunde</small></h2>
    <div class="map3d" id="map3d"><div class="placeholder"><div><div style="font-family:var(--font-display);font-size:20px;font-weight:700">Gelände in 3D</div>
      <div class="hint">Startplätze in Ampelfarbe, Pfeil = Modellwind am Start. Lädt Karte und Gelände (einige MB).</div>
      <button type="button" class="btn primary" id="btn-map" style="margin-top:10px">3D-Karte laden</button></div></div></div>
    <div class="hint">Ziehen = verschieben, zwei Finger = drehen und neigen. Startplatz antippen wechselt den Tab. Gelände: Mapterhorn, Karte: OpenFreeMap / OpenStreetMap.</div>`;
}
async function initMap() {
  const box = document.getElementById("map3d");
  box.innerHTML = `<div class="placeholder"><div class="hint">Lade 3D-Karte…</div></div>`;
  try {
    if (!window.maplibregl) {
      await loadAsset("link", { rel: "stylesheet", href: MAPLIBRE_CSS });
      await loadAsset("script", { src: MAPLIBRE_JS });
    }
    box.innerHTML = "";
    const s = site();
    MAP = new maplibregl.Map({
      container: box, style: "https://tiles.openfreemap.org/styles/liberty",
      center: [s.lon, s.lat - 0.012], zoom: 12.3, pitch: 62, bearing: -15, maxPitch: 80,
      attributionControl: { compact: true },
    });
    MAP.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    MAP.on("load", () => {
      const dem = { type: "raster-dem", tiles: ["https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"], encoding: "terrarium", tileSize: 512, maxzoom: 12, attribution: "© Mapterhorn" };
      MAP.addSource("dem", dem);
      MAP.addSource("dem-hs", { ...dem });
      MAP.addLayer({ id: "hillshade", type: "hillshade", source: "dem-hs", paint: { "hillshade-exaggeration": 0.35 } });
      MAP.setTerrain({ source: "dem", exaggeration: 1.4 });
      MAP_SITE = s.id; MAP_READY = true;
      box.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      updateMap();
    });
  } catch (e) {
    box.innerHTML = `<div class="placeholder"><div class="err">${e.message}</div></div>`;
    MAP = null;
  }
}
function updateMap(sec) {
  const btn = document.getElementById("btn-map");
  if (btn && !btn.dataset.bound) { btn.dataset.bound = "1"; btn.addEventListener("click", initMap); }
  if (!MAP || !MAP_READY) return;
  MAP_MARKERS.forEach(m => m.remove()); MAP_MARKERS = [];
  const lands = new Map();
  SITES.forEach(s => {
    const h = profileHour(s);
    const lv = h ? h.score.level : null;
    const bg = lv == null ? "#8c9eab" : ["#1e9a55", "#d89e00", "#d23c3c"][lv];
    const el = document.createElement("div");
    el.className = "mk" + (s.id === S.tab ? " sel" : "");
    el.innerHTML = `<div class="bub" style="background:${bg}">${h && h.dir != null ? `<svg viewBox="0 0 24 24"><g transform="rotate(${h.dir + 180} 12 12)"><path d="M12 2 L17.5 11 L13.6 11 L13.6 22 L10.4 22 L10.4 11 L6.5 11 Z" fill="#fff"/></g></svg>` : ""}</div>
      ${s.id === S.tab || !s.approx ? `<div class="tag">${s.name}${s.id === S.tab && h && h.windLaunch != null ? ` · ${Math.round(h.windLaunch)} km/h` : ""}</div>` : ""}`;
    el.title = `${s.name}: ${lv == null ? "keine Daten" : LEVEL_TXT[lv]}${h ? " um " + h.hour + " Uhr" : ""}`;
    el.addEventListener("click", () => { S.tab = s.id; SEL.hour = null; saveSettings(); renderAll(); });
    MAP_MARKERS.push(new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([s.lon, s.lat]).addTo(MAP));
    lands.set(s.landing.name, s.landing);
  });
  lands.forEach(l => {
    const el = document.createElement("div");
    el.className = "mk land"; el.title = l.name;
    el.innerHTML = `<div class="bub">L</div>`;
    MAP_MARKERS.push(new maplibregl.Marker({ element: el }).setLngLat([l.lon, l.lat]).addTo(MAP));
  });
  if (MAP_SITE !== S.tab) {
    const s = site(); MAP_SITE = s.id;
    MAP.easeTo({ center: [s.lon, s.lat - 0.012], zoom: 12.3, duration: 1200 });
  }
}

/* --- Generischer Zeitreihen-Chart --- */
function lineChart({ time, series, thresholds = [], bars = null, height = 130, hatchAbove = null }) {
  const W = 340, H = height, pl = 30, pr = 6, pt = 8, pb = 18, n = time.length;
  const x = i => pl + (W - pl - pr) * (i / Math.max(1, n - 1));
  const vals = series.flatMap(s => s.vals).concat(bars ? bars.vals : []).filter(v => v != null);
  const top = Math.max(1, ...vals, ...thresholds.map(t => t.v)) * 1.12, yMin = Math.min(0, ...vals);
  const y = v => pt + (H - pt - pb) * (1 - (v - yMin) / (top - yMin));
  const uid = "h" + Math.random().toString(36).slice(2, 8);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
  if (hatchAbove != null && hatchAbove < top) {
    svg += `<defs><pattern id="${uid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--stop);stroke-width:1.6;opacity:.4"/></pattern></defs>
      <rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${Math.max(0, y(hatchAbove) - pt)}" style="fill:url(#${uid})"/>`;
  }
  niceTicks(yMin, top, 4).forEach(t => svg += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl - 4}" y="${y(t) + 3}" text-anchor="end">${t}</text>`);
  time.forEach((t, i) => {
    if (t.endsWith("T00:00") && i > 0) svg += `<line class="daysep" x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${H - pb}"/>`;
    if (t.endsWith("T12:00")) svg += `<text x="${x(i)}" y="${H - 5}" text-anchor="middle">${dayParts(t.slice(0, 10)).wd}</text>`;
  });
  thresholds.forEach(th => svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(th.v)}" y2="${y(th.v)}" style="stroke:${th.color};stroke-width:1;stroke-dasharray:4 3"/>`);
  if (bars) {
    const bw = Math.max(1, (W - pl - pr) / n - 0.6);
    bars.vals.forEach((v, i) => { if (v > 0) svg += `<rect x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${Math.max(0, y(yMin) - y(v))}" style="fill:${bars.color};opacity:.6"/>`; });
  }
  series.forEach(s => {
    let d = "", pen = false;
    s.vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); pen = true; });
    svg += `<path d="${d}" style="fill:none;stroke:${s.color};stroke-width:${s.width || 1.8};stroke-linejoin:round;${s.dash ? "stroke-dasharray:" + s.dash : ""}"/>`;
  });
  const ni = isSim() ? -1 : time.indexOf(nowLocalKey());
  if (ni >= 0) svg += `<line class="nowline" x1="${x(ni)}" x2="${x(ni)}" y1="${pt}" y2="${H - pb}"/>`;
  const day = curDay();
  if (SEL.hour != null && day) {
    const si = time.indexOf(keyOf(day.key, SEL.hour));
    if (si >= 0) svg += `<line x1="${x(si)}" x2="${x(si)}" y1="${pt}" y2="${H - pb}" style="stroke:var(--accent);stroke-width:1.5"/>`;
  }
  return svg + `</svg>`;
}
function niceTicks(a, b, count) {
  const raw = (b - a) / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(a / step) * step; v <= b; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

/* ============================================================
   Einstellungen
   ============================================================ */
const MOD_TITLES = Object.fromEntries(Object.entries(MODULES).map(([k, m]) => [k, m.title]));
function renderBurnairSettings() {
  let fb = document.getElementById("fs-burnair");
  if (!fb) { fb = document.createElement("fieldset"); fb.id = "fs-burnair"; document.getElementById("fs-limits").before(fb); }
  if (!BURNAIR_PROXY) { fb.innerHTML = `<legend>Burnair</legend><div class="hint">Burnair-Verbindung ist für diese Seite noch nicht eingerichtet.</div>`; return; }
  if (BA) {
    fb.innerHTML = `<legend>Burnair</legend><div class="hint">Angemeldet als <b>${BA.name.replace(/[<>&]/g, "")}</b>. Wind auf Starthöhe, Basis und Thermik kommen aus Burnair.</div>
      <div class="btn-row"><button type="button" class="btn" id="ba-logout">Abmelden</button></div>`;
    fb.querySelector("#ba-logout").addEventListener("click", () => { burnairLogout(); renderBurnairSettings(); recompute(); });
    return;
  }
  fb.innerHTML = `<legend>Burnair</legend>
    <div class="hint">Mit deinem Burnair-Konto anmelden, um bessere Punktprognosen einzubinden. Das Passwort wird nicht gespeichert, nur ein Burnair-Token in diesem Browser.</div>
    <div class="one-row" style="grid-template-columns:90px 1fr"><label for="ba-user">E-Mail</label><input id="ba-user" type="email" autocomplete="username" style="text-align:left"></div>
    <div class="one-row" style="grid-template-columns:90px 1fr"><label for="ba-pass">Passwort</label><input id="ba-pass" type="password" autocomplete="current-password" style="text-align:left"></div>
    <div class="btn-row"><span class="hint" id="ba-status" style="flex:1"></span><button type="button" class="btn primary" id="ba-login">Anmelden</button></div>`;
  fb.querySelector("#ba-login").addEventListener("click", async () => {
    const st = fb.querySelector("#ba-status"), btn = fb.querySelector("#ba-login");
    btn.disabled = true; st.textContent = "Melde an…";
    try {
      await burnairLogin(fb.querySelector("#ba-user").value.trim(), fb.querySelector("#ba-pass").value);
      st.textContent = "Angemeldet. Lade Burnair-Daten…";
      renderBurnairSettings(); load();
    } catch (e) { st.textContent = e.message; btn.disabled = false; }
  });
}
function renderSettings() {
  renderBurnairSettings();
  document.getElementById("fs-limits").innerHTML = `<legend>Grenzwerte</legend><div class="lim-row head"><span></span><span>grün bis</span><span>rot über</span></div>` +
    PARAMS.map(p => `<div class="lim-row"><label for="lim-${p.key}-g">${p.label}${p.unit ? ` <span class="muted">(${p.unit})</span>` : ""}${p.invert ? " ↓" : ""}</label>
      <input id="lim-${p.key}-g" type="number" step="any" inputmode="decimal" value="${S.limits[p.key].g}">
      <input id="lim-${p.key}-r" type="number" step="any" inputmode="decimal" value="${S.limits[p.key].r}" aria-label="${p.label} rot"></div>`).join("");
  document.getElementById("fs-extra").innerHTML = `<legend>Zeitraum & Sonstiges</legend>` + EXTRA_DEFS.map(d => `<div class="one-row"><label for="ex-${d.key}">${d.label} <span class="muted">(${d.unit})</span></label>
      <input id="ex-${d.key}" type="number" step="any" inputmode="decimal" value="${S.extra[d.key]}"></div>`).join("");
  const fm = document.getElementById("fs-modules");
  fm.innerHTML = `<legend>Module</legend>` + S.order.map((id, i) => `<div class="mod-row">
      <label for="mod-on-${id}"><input type="checkbox" id="mod-on-${id}" ${S.modules[id] ? "checked" : ""}> ${MOD_TITLES[id]}</label>
      <button type="button" data-move="${id}" data-dir="-1" aria-label="${MOD_TITLES[id]} nach oben" ${i === 0 ? "disabled" : ""}>↑</button>
      <button type="button" data-move="${id}" data-dir="1" aria-label="${MOD_TITLES[id]} nach unten" ${i === S.order.length - 1 ? "disabled" : ""}>↓</button></div>`).join("");
  fm.querySelectorAll("[data-move]").forEach(b => b.addEventListener("click", () => {
    readSettingsForm();
    const i = S.order.indexOf(b.dataset.move), j = i + (+b.dataset.dir);
    [S.order[i], S.order[j]] = [S.order[j], S.order[i]];
    renderSettings();
  }));
}
function readSettingsForm() {
  const num = (id, fb) => { const v = parseFloat(document.getElementById(id).value); return isFinite(v) ? v : fb; };
  PARAMS.forEach(p => S.limits[p.key] = { g: num(`lim-${p.key}-g`, S.limits[p.key].g), r: num(`lim-${p.key}-r`, S.limits[p.key].r) });
  const oldSimDays = S.extra.simDays;
  EXTRA_DEFS.forEach(d => S.extra[d.key] = num(`ex-${d.key}`, S.extra[d.key]));
  S.extra.hourFrom = Math.max(0, Math.min(23, Math.round(S.extra.hourFrom)));
  S.extra.hourTo = Math.max(S.extra.hourFrom, Math.min(23, Math.round(S.extra.hourTo)));
  S.extra.simDays = Math.max(7, Math.min(90, Math.round(S.extra.simDays)));
  if (S.extra.simDays !== oldSimDays) { DATA.simFc = null; DATA.simFoehn = null; DATA.simHist = null; }
  MODULE_IDS.forEach(id => { const cb = document.getElementById(`mod-on-${id}`); if (cb) S.modules[id] = cb.checked; });
  const match = LEVELS.findIndex((_, i) => PARAMS.every(p => { const a = presetLimits(i)[p.key], b = S.limits[p.key]; return a.g === b.g && a.r === b.r; }));
  if (match >= 0) { S.level = match; S.levelBase = match; }
  else { if (S.level !== "custom") S.levelBase = S.level; S.level = "custom"; }
}
const dlg = document.getElementById("settings");
document.getElementById("btn-settings").addEventListener("click", () => { renderSettings(); dlg.showModal(); });
document.getElementById("btn-save").addEventListener("click", () => {
  readSettingsForm(); saveSettings(); dlg.close();
  if (isSim() && !DATA.simFc) loadSim(); else recompute();
});
let resetArmed = false;
document.getElementById("btn-reset").addEventListener("click", e => {
  if (!resetArmed) {
    resetArmed = true; e.target.textContent = "Wirklich? Nochmal tippen";
    setTimeout(() => { resetArmed = false; e.target.textContent = "Alles auf Anfänger zurücksetzen"; }, 4000);
    return;
  }
  const keep = { tab: S.tab, mode: S.mode }; S = Object.assign(defaultSettings(), keep); saveSettings(); renderSettings();
  resetArmed = false; e.target.textContent = "Zurückgesetzt"; recompute();
});

/* ============================================================
   Ablauf
   ============================================================ */
function recompute() {
  EVAL = {};
  const A = activeData();
  if (A.fc) SITES.forEach(s => { try { EVAL[s.id] = evaluateSite(s); } catch (e) { console.error(s.id, e); } });
  const ev = EVAL[S.tab];
  if (ev && SEL.dayIdx >= ev.days.length) SEL.dayIdx = 0;
  if (isSim() && ev && SEL.dayIdx === 0 && !SEL.touched) {
    // Rückblick: mit dem besten Tag starten
    let bi = 0; ev.days.forEach((d, i) => { if (d.greenHours > ev.days[bi].greenHours) bi = i; });
    SEL.dayIdx = bi; SEL.touched = true;
  }
  renderAll();
}
function renderAll() { renderControls(); renderTabs(); renderHero(); renderHours(); renderModules(); renderStamp(); }
function renderStamp() {
  const el = document.getElementById("stamp");
  if (SIM_LOADING) { el.textContent = "Lade Rückblick…"; return; }
  if (!DATA.fetchedAt) { el.textContent = "Lade Prognose…"; return; }
  const errs = Object.keys(DATA.errors).length;
  el.textContent = `Stand ${DATA.fetchedAt.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr` + (DATA.burnair ? " · mit Burnair" : "") + (errs ? " · teilweise Fehler" + (DATA.errors.burnair ? " (Burnair: " + DATA.errors.burnair + ")" : "") : "");
}
async function load() {
  const btn = document.getElementById("btn-refresh");
  btn.classList.add("spin");
  ["fc", "foehn", "live", "hist", "burnair"].forEach(k => delete DATA.errors[k]);
  const days = S.mode === "week" ? 7 : 3;
  const jobs = {
    fc: fetchForecast(OM_LIVE, { past_days: "1", forecast_days: String(days) }, MODELS_LIVE),
    foehn: fetchFoehn(OM_LIVE, { forecast_days: String(days) }),
    live: fetchLive(),
    hist: fetchHistory(36),
    burnair: fetchBurnair(days),
  };
  const res = await Promise.allSettled(Object.values(jobs));
  Object.keys(jobs).forEach((k, i) => { if (res[i].status === "fulfilled") DATA[k] = res[i].value; else DATA.errors[k] = res[i].reason.message; });
  DATA.fcWeek = days === 7;
  DATA.fetchedAt = new Date();
  btn.classList.remove("spin");
  recompute();
}
async function loadSim() {
  SIM_LOADING = true; delete DATA.errors.sim; SEL.touched = false; renderAll();
  const n = S.extra.simDays;
  const end = new Date(Date.now() - 864e5), start = new Date(Date.now() - n * 864e5);
  // ein Tag Vorlauf, damit der Windverlauf auch den Vortag des ersten Tages hat
  const range = { start_date: dateStr(new Date(start - 864e5)), end_date: dateStr(end) };
  try {
    const [fc, foehn, hist] = await Promise.allSettled([
      fetchForecast(OM_HIST, range, MODELS_SIM), fetchFoehn(OM_HIST, range), fetchHistory((n + 2) * 24),
    ]);
    if (fc.status !== "fulfilled") throw fc.reason;
    DATA.simFc = fc.value;
    DATA.simFoehn = foehn.status === "fulfilled" ? foehn.value : null;
    DATA.simHist = hist.status === "fulfilled" ? hist.value : null;
    if (foehn.status !== "fulfilled") DATA.errors.sim = "Föhn: " + foehn.reason.message;
  } catch (e) { DATA.errors.sim = e.message; }
  SIM_LOADING = false;
  // Rückblick zählt den ersten (Vorlauf-)Tag nicht
  recompute();
}
document.getElementById("btn-refresh").addEventListener("click", () => {
  if (isSim()) { DATA.simFc = null; loadSim(); } else load();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !isSim() && DATA.fetchedAt && Date.now() - DATA.fetchedAt > 15 * 60e3) load();
});
// Webcams alle 5 Minuten auffrischen, ohne den Rest neu zu zeichnen
setInterval(() => document.querySelectorAll("img[data-cam]:not([data-tl])").forEach(img => img.src = camURL(img.dataset.cam)), 300e3);

document.documentElement.style.setProperty("--bg-img", `url("${new URL(R.bg, location.href).href}")`);
document.getElementById("brand").innerHTML = R.brand;
document.getElementById("credits").innerHTML = R.credits;
renderAll();
load();
