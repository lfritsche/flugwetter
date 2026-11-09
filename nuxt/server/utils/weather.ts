// Datenquellen (Server). Portiert aus app.js; laufen jetzt in Nitro und werden dort gecacht.
// @ts-nocheck
import { localKey, dateStr } from "#shared/format";
import { hourBuckets } from "#shared/engine";

export const HOURLY = [
  "wind_speed_10m", "wind_gusts_10m", "wind_direction_10m",
  "wind_speed_850hPa", "wind_direction_850hPa", "wind_speed_700hPa", "wind_direction_700hPa",
  "cape", "lifted_index", "precipitation", "cloud_base", "cloud_cover_low", "boundary_layer_height",
  "visibility", "pressure_msl", "weather_code", "temperature_2m", "dew_point_2m",
].join(",");
export const MODELS_LIVE = "icon_d2,meteoswiss_icon_ch2,icon_eu,ecmwf_ifs025,gfs_seamless";
export const MODELS_SIM = "icon_d2,meteoswiss_icon_ch2,gfs_seamless";
export const OM_LIVE = "https://api.open-meteo.com/v1/forecast?";
export const OM_HIST = "https://historical-forecast-api.open-meteo.com/v1/forecast?";

export async function getJSON(url, tries = 3) {
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
export async function fetchForecast(R, base, range, models) {
  const SITES = R.SITES;
  const pts = SITES.flatMap(s => [s, s.landing]);
  const q = new URLSearchParams({
    latitude: pts.map(p => p.lat).join(","), longitude: pts.map(p => p.lon).join(","),
    elevation: pts.map(p => p.elev).join(","),
    hourly: HOURLY, daily: "sunrise,sunset", models, timezone: "Europe/Vienna", ...range,
  });
  const [arr, prof] = await Promise.all([getJSON(base + q), fetchLaunchProfile(SITES, base, range).catch(() => null)]);
  const out = {};
  SITES.forEach((s, i) => {
    const dly = arr[i * 2].daily || {}, sun = {};
    // Modell-Suffixe bei daily: erstes vorhandenes Feld nehmen
    const pick = k => dly[k] || dly[Object.keys(dly).find(x => x.startsWith(k + "_"))] || [];
    (dly.time || []).forEach((d, j) => { const r = pick("sunrise")[j], t = pick("sunset")[j]; if (r && t) sun[d] = { rise: +r.slice(11, 13) * 60 + +r.slice(14, 16), set: +t.slice(11, 13) * 60 + +t.slice(14, 16) }; });
    out[s.id] = { launch: mergeByTime(arr[i * 2].hourly, prof?.[i]), land: arr[i * 2 + 1].hourly, sun };
  });
  return out;
}
/* Feuchte auf Starthöhe (aus Druckflächen interpoliert) und Wind 80 m, nur ICON-D2.
   Analyse 60 Tage: Feuchte ≥ 95 % auf Starthöhe plus tiefe ICON-CH2-Basis gab 1 falschen Alarm von 52. */
const PLEV = ["950", "925", "900", "850", "800", "700"];
function atElev(h, i, elev, key) {
  const pts = PLEV.map(p => [h[`geopotential_height_${p}hPa`]?.[i], h[`${key}_${p}hPa`]?.[i]]).filter(([z, r]) => z != null && r != null).sort((a, b) => a[0] - b[0]);
  for (let k = 0; k < pts.length - 1; k++) {
    const [z0, r0] = pts[k], [z1, r1] = pts[k + 1];
    if (z0 <= elev && elev <= z1) return r0 + (r1 - r0) * (elev - z0) / (z1 - z0);
  }
  return null;
}
export const rhAtElev = (h, i, elev) => { const v = atElev(h, i, elev, "relative_humidity"); return v == null ? null : Math.round(v); };
/** Temperaturabnahme Start bis 700 hPa in °C/km (Thermikindex). Null, wenn 700 hPa weniger als 500 m über dem Start liegt. */
export function lapseFromStart(h, i, elev) {
  const t0 = atElev(h, i, elev, "temperature"), t7 = h.temperature_700hPa?.[i], z7 = h.geopotential_height_700hPa?.[i];
  if (t0 == null || t7 == null || z7 == null || z7 - elev < 500) return null;
  return Math.round((t0 - t7) / (z7 - elev) * 10000) / 10;
}
async function fetchLaunchProfile(SITES, base, range) {
  const q = new URLSearchParams({
    latitude: SITES.map(s => s.lat).join(","), longitude: SITES.map(s => s.lon).join(","),
    hourly: ["wind_speed_80m", "wind_direction_80m", ...PLEV.flatMap(p => [`relative_humidity_${p}hPa`, `geopotential_height_${p}hPa`, `temperature_${p}hPa`])].join(","),
    models: "icon_d2", timezone: "Europe/Vienna", ...range,
  });
  const res = await getJSON(base + q, 2), arr = Array.isArray(res) ? res : [res];
  return SITES.map((s, i) => {
    const h = arr[i]?.hourly; if (!h) return null;
    return { time: h.time, rh_launch_icon_d2: h.time.map((_, j) => rhAtElev(h, j, s.elev)), lapse_icon_d2: h.time.map((_, j) => lapseFromStart(h, j, s.elev)), wind_speed_80m_icon_d2: h.wind_speed_80m, wind_direction_80m_icon_d2: h.wind_direction_80m };
  });
}
function mergeByTime(hourly, extra) {
  if (!extra) return hourly;
  const idx = new Map(extra.time.map((t, j) => [t, j]));
  for (const [k, v] of Object.entries(extra)) if (k !== "time") hourly[k] = hourly.time.map(t => { const j = idx.get(t); return j == null ? null : v[j] ?? null; });
  return hourly;
}
export async function fetchFoehn(R, base, range) {
  const FOEHN = R.foehn, FOEHN_POINTS = [FOEHN.primary.a, FOEHN.primary.b, FOEHN.secondary.a, FOEHN.secondary.b];
  const q = new URLSearchParams({
    latitude: FOEHN_POINTS.map(p => p.lat).join(","), longitude: FOEHN_POINTS.map(p => p.lon).join(","),
    hourly: "pressure_msl,temperature_800hPa", timezone: "Europe/Vienna", ...range,
  });
  const arr = await getJSON(base + q);
  const p = FOEHN_POINTS.map((_, i) => arr[i].hourly.pressure_msl);
  const time = arr[0].hourly.time;
  const d = (a, b) => a == null || b == null ? null : Math.round((a - b) * 10) / 10;
  const bi = time.map((_, i) => d(p[0][i], p[1][i]));
  const lz = time.map((_, i) => d(p[2][i], p[3][i]));
  // Lee minus Luv auf ca. 2000 m, nur zur Anzeige (im Backtest kein Zusatznutzen)
  const T = i => arr[i].hourly.temperature_800hPa || [];
  const dt = time.map((_, i) => d(T(1)[i], T(0)[i]));
  const byTime = {}; time.forEach((t, i) => byTime[t] = { bi: bi[i], lz: lz[i], dt: dt[i] });
  return { time, bi, lz, byTime };
}
/** Stationen für den Verlauf: Messstationen der Startplätze und Sonnen-Stationen der Region */
const histIds = R => [...new Set([...R.SITES.flatMap(s => [s.historyStation, s.measureStation]), ...(R.sunStations || [])].filter(Boolean))];
/* Stations-Provider: liefern live → {ts, st:{id:{dir,ff,ffx}}} und history(h) → {id:{"YYYY-MM-DDTHH:00":{dir,ff,ffx}}} in km/h */
export const PROVIDERS = {
  geosphere: {
    parse(d) {
      return (d.features || []).reduce((acc, f) => {
        const p = f.properties.parameters, arr = k => (p[k] && p[k].data) || [];
        acc[f.properties.station] = { dir: arr("DD"), ff: arr("FF").map(v => v == null ? null : v * 3.6), ffx: arr("FFX").map(v => v == null ? null : v * 3.6), so: arr("SO"), rf: arr("RF") };
        return acc;
      }, {});
    },
    async live(R) {
      const STATIONS = R.STATIONS;
      const q = new URLSearchParams({ parameters: "DD,FF,FFX,SO,RF", station_ids: STATIONS.map(s => s.id).join(",") });
      const d = await getJSON("https://dataset.api.hub.geosphere.at/v1/station/current/tawes-v1-10min?" + q);
      const st = this.parse(d), out = { ts: d.timestamps && d.timestamps[0], st: {} };
      Object.entries(st).forEach(([id, v]) => out.st[id] = { dir: v.dir[0] ?? null, ff: v.ff[0] ?? null, ffx: v.ffx[0] ?? null, sun: v.so[0] == null ? null : v.so[0] / 600, rh: v.rf[0] ?? null });
      return out;
    },
    async history(R, hoursBack, ids = histIds(R)) {
      const start = new Date(Date.now() - hoursBack * 3600e3).toISOString().slice(0, 16);
      const end = new Date().toISOString().slice(0, 16);
      const q = new URLSearchParams({ parameters: "DD,FF,FFX,SO", station_ids: ids.join(","), start, end });
      const d = await getJSON("https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min?" + q);
      const st = this.parse(d), out = {};
      Object.entries(st).forEach(([id, v]) => out[id] = hourBuckets(d.timestamps.map((ts, i) => ({ t: new Date(ts), dir: v.dir[i], ff: v.ff[i], ffx: v.ffx[i], sun: v.so[i] == null ? null : v.so[i] / 600 }))));
      return out;
    },
  },
};
/* Südtiroler Landeswetterdienst: WG = Mittel, WG.BOE = Böe (m/s), WR = Richtung; DATE mit CEST/CET-Suffix */
const BZ = "https://geoservices.buergernetz.bz.it/services/meteo/v1";
const bzDate = s => new Date(s.replace("CEST", "+02:00").replace("CET", "+01:00"));
const ymd = d => dateStr(d).replace(/-/g, "");
PROVIDERS.suedtirol = {
  async live(R) {
      const STATIONS = R.STATIONS;
    const out = { ts: null, st: {} };
    await Promise.all(STATIONS.map(async st => {
      try {
        const rows = await getJSON(`${BZ}/sensors?station_code=${st.id}`);
        const v = t => rows.find(r => r.TYPE === t);
        const wg = v("WG"), gb = v("WG.BOE"), wr = v("WR"), sd = v("SD"), lf = v("LF");
        out.st[st.id] = { dir: wr ? wr.VALUE : null, ff: wg ? wg.VALUE * 3.6 : null, ffx: gb ? gb.VALUE * 3.6 : null, sun: sd ? sd.VALUE / 600 : null, rh: lf ? lf.VALUE : null };
        const t = wg && bzDate(wg.DATE);
        if (t && (!out.ts || t > new Date(out.ts))) out.ts = t.toISOString();
      } catch (e) { out.st[st.id] = {}; }
    }));
    return out;
  },
  async history(R, hoursBack, ids = histIds(R), lite = false) {
    const tries = lite ? 1 : 3;   // Trefferquote: Abrufe sparen (Workers-Limit)
    const from = ymd(new Date(Date.now() - hoursBack * 3600e3)), to = ymd(new Date(Date.now() + 864e5));
    const out = {};
    await Promise.all(ids.map(async id => {
      const get = code => getJSON(`${BZ}/timeseries?station_code=${id}&sensor_code=${code}&date_from=${from}&date_to=${to}`, tries);
      // lite: nur Mittel und Böe (Trefferquote), spart Abrufe. Eine ausgefallene Station bricht nicht alles ab.
      let wg, gb, wr, sd;
      try { [wg, gb, wr, sd] = await Promise.all([get("WG"), get("WG.BOE"), lite ? [] : get("WR"), lite ? [] : get("SD").catch(() => [])]); }
      catch { return; }
      const byT = {};
      const put = (arr, k, f) => arr.forEach(r => { (byT[r.DATE] = byT[r.DATE] || { t: bzDate(r.DATE) })[k] = f(r.VALUE); });
      put(wg, "ff", v => v * 3.6); put(gb, "ffx", v => v * 3.6); put(wr, "dir", v => v); put(sd || [], "sun", v => v / 600);
      out[id] = hourBuckets(Object.values(byT));
    }));
    return out;
  },
};

/* MeteoSchweiz Open Data (CC BY 4.0, Quelle: MeteoSchweiz). Zeiten UTC, Stundenwerte markieren das Intervallende. */
const MS = "https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn";
const num = x => x === "" || x === "-" || x == null ? null : +x;
async function getText(url, headers = {}) {
  const r = await fetch(url, { headers });
  if (!r.ok && r.status !== 206) throw new Error("HTTP " + r.status + " bei " + new URL(url).host);
  return r.text();
}
export function parseVQHA80(text, ids) {
  const L = text.trim().split(/\r?\n/), H = L[0].split(";"), out = { ts: null, st: {} };
  for (const l of L.slice(1)) {
    const c = l.split(";");
    if (!ids.has(c[0])) continue;
    const g = k => num(c[H.indexOf(k)]), s = c[1];
    out.ts = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:00Z`;
    const sun = g("sre000z0");
    out.st[c[0]] = { dir: g("dkl010z0"), ff: g("fu3010z0"), ffx: g("fu3010z1"), sun: sun == null ? null : sun / 10, rh: g("ure200s0") };
  }
  return out;
}
const msTime = s => Date.UTC(+s.slice(6, 10), +s.slice(3, 5) - 1, +s.slice(0, 2), +s.slice(11, 13), +s.slice(14, 16));
/* Stundenwerte: rec darf am Anfang abgeschnitten sein (Range), Kopf kommt aus now */
export function parseHourly(now, rec, fromMs) {
  const h = now.slice(0, now.search(/\r?\n/)).split(";"), F = h.indexOf("fu3010h0"), G = h.indexOf("fu3010h1"), D = h.indexOf("dkl010h0"), SU = h.indexOf("sre000h0"), o = {};
  for (const l of `${rec}\n${now}`.split(/\r?\n/)) {
    if (!/^[A-Z0-9]{3};\d/.test(l)) continue;
    const c = l.split(";"), t = msTime(c[1]) - 3600e3;
    const sun = SU < 0 ? null : num(c[SU]);
    if (t >= fromMs && (num(c[F]) != null || sun != null)) o[localKey(new Date(t))] = { dir: num(c[D]), ff: num(c[F]), ffx: num(c[G]), ...(sun == null ? {} : { sun: sun / 60 }) };
  }
  return o;
}
PROVIDERS.meteoswiss = {
  async live(R) {
    return parseVQHA80(await getText("https://data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv"), new Set(R.STATIONS.map(s => s.id)));
  },
  async history(R, hoursBack, ids = histIds(R)) {
    const from = Date.now() - hoursBack * 3600e3, out = {};
    await Promise.all(ids.map(async id => {
      const a = id.toLowerCase();
      const [now, rec] = await Promise.all([
        getText(`${MS}/${a}/ogd-smn_${a}_h_now.csv`),
        getText(`${MS}/${a}/ogd-smn_${a}_h_recent.csv`, { Range: `bytes=-${hoursBack * 200 + 4000}` }),
      ]);
      out[id] = parseHourly(now, rec, from);
    }));
    return out;
  },
};

/* Föhn-Messsignale der letzten Stunden, roh je "src:id". Einzelne Ausfälle fallen still weg: Messung verschärft nur. */
export function parseSlf(rows) {
  return rows.map(r => ({ t: r.measure_date, g: r.VW_30MIN_MAX == null ? null : r.VW_30MIN_MAX * 3.6, dir: r.DW_30MIN_MEAN, rh: r.RH_30MIN_MEAN, ta: r.TA_30MIN_MEAN }));
}
export function parseMsNow(text) {
  const L = text.trim().split(/\r?\n/), H = L[0].split(";"), i = k => H.indexOf(k);
  return L.slice(1).map(l => { const c = l.split(";"); return { t: new Date(msTime(c[i("reference_timestamp")])).toISOString(), g: num(c[i("fu3010z1")]), dir: num(c[i("dkl010z0")]), rh: num(c[i("ure200s0")]), ta: num(c[i("tre200s0")]) }; });
}
export function parseGeosphereSamples(d) {
  const p = d.features?.[0]?.properties?.parameters || {}, arr = k => p[k]?.data || [];
  return (d.timestamps || []).map((t, i) => ({ t: new Date(t).toISOString(), g: arr("FFX")[i] == null ? null : arr("FFX")[i] * 3.6, dir: arr("DD")[i] ?? null, rh: arr("RF")[i] ?? null, ta: arr("TL")[i] ?? null }));
}
const SAMPLERS = {
  geosphere: async id => {
    const iso = ms => new Date(ms).toISOString().slice(0, 16);
    const q = new URLSearchParams({ parameters: "DD,FFX,RF,TL", station_ids: id, start: iso(Date.now() - 12 * 3600e3), end: iso(Date.now()) });
    return parseGeosphereSamples(await getJSON(`https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min?${q}`, 1));
  },
  slf: async id => parseSlf(await getJSON(`https://measurement-api.slf.ch/public/api/imis/station/${id}/measurements`, 1)),
  meteoswiss: async id => { const a = id.toLowerCase(); return parseMsNow(await getText(`${MS}/${a}/ogd-smn_${a}_t_now.csv`)); },
  suedtirol: async id => {
    const from = ymd(new Date(Date.now() - 864e5)), to = ymd(new Date(Date.now() + 864e5));
    const get = code => getJSON(`${BZ}/timeseries?station_code=${id}&sensor_code=${code}&date_from=${from}&date_to=${to}`, 1);
    const [gb, wr, lf] = await Promise.all([get("WG.BOE"), get("WR"), get("LF").catch(() => [])]);
    const by = {};
    const put = (arr, k, f) => arr.forEach(r => { (by[r.DATE] = by[r.DATE] || { t: bzDate(r.DATE).toISOString() })[k] = f(r.VALUE); });
    put(gb, "g", v => v * 3.6); put(wr, "dir", v => v); put(lf, "rh", v => v);
    return Object.values(by);
  },
};
export async function fetchFoehnSamples(R) {
  const defs = R.foehn.live || [], keys = new Set();
  defs.forEach(d => (d.type === "split" ? [d.a, d.b] : [d.station]).forEach(id => keys.add(`${d.src}:${id}`)));
  const since = Date.now() - 12 * 3600e3, out = {}, failed = [];
  await Promise.all([...keys].map(async k => {
    const [src, id] = k.split(":");
    try { out[k] = (await SAMPLERS[src](id)).filter(r => +new Date(r.t) >= since); } catch (e) { failed.push(k); console.warn("[foehn-live]", k, e.message); }
  }));
  return { samples: out, failed };
}
