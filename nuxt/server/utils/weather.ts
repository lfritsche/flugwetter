// Datenquellen (Server). Portiert aus app.js; laufen jetzt in Nitro und werden dort gecacht.
// @ts-nocheck
import { localKey, dateStr } from "#shared/format";
import { hourBuckets } from "#shared/engine";

export const HOURLY = [
  "wind_speed_10m", "wind_gusts_10m", "wind_direction_10m",
  "wind_speed_850hPa", "wind_direction_850hPa", "wind_speed_700hPa", "wind_direction_700hPa",
  "cape", "lifted_index", "precipitation", "cloud_base", "cloud_cover_low", "boundary_layer_height",
  "visibility", "pressure_msl", "weather_code",
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
export async function fetchFoehn(R, base, range) {
  const FOEHN = R.foehn, FOEHN_POINTS = [FOEHN.primary.a, FOEHN.primary.b, FOEHN.secondary.a, FOEHN.secondary.b];
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
export const PROVIDERS = {
  geosphere: {
    parse(d) {
      return (d.features || []).reduce((acc, f) => {
        const p = f.properties.parameters, arr = k => (p[k] && p[k].data) || [];
        acc[f.properties.station] = { dir: arr("DD"), ff: arr("FF").map(v => v == null ? null : v * 3.6), ffx: arr("FFX").map(v => v == null ? null : v * 3.6) };
        return acc;
      }, {});
    },
    async live(R) {
      const STATIONS = R.STATIONS;
      const q = new URLSearchParams({ parameters: "DD,FF,FFX", station_ids: STATIONS.map(s => s.id).join(",") });
      const d = await getJSON("https://dataset.api.hub.geosphere.at/v1/station/current/tawes-v1-10min?" + q);
      const st = this.parse(d), out = { ts: d.timestamps && d.timestamps[0], st: {} };
      Object.entries(st).forEach(([id, v]) => out.st[id] = { dir: v.dir[0] ?? null, ff: v.ff[0] ?? null, ffx: v.ffx[0] ?? null });
      return out;
    },
    async history(R, hoursBack) {
      const SITES = R.SITES;
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
  async live(R) {
      const STATIONS = R.STATIONS;
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
  async history(R, hoursBack) {
      const SITES = R.SITES;
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
