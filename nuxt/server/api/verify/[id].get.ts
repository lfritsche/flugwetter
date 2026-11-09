// Modell-Trefferquote: Böen von ICON-D2 und ICON-CH2 am Ort der Stationen gegen die Messung, letzte 14 Tage, 6 h gecacht
import { getJSON, historyAll } from "../../utils/weather";
import { dateStr } from "#shared/format";
import { verifyStation, VERIFY } from "#shared/verify";

const DAYS = 14;
export default defineCachedEventHandler(async (event) => {
  const R = getRegion(getRouterParam(event, "id"));
  const st = R.STATIONS.filter(s => s.lat != null && s.lon != null);
  const range = { start_date: dateStr(new Date(Date.now() - DAYS * 864e5)), end_date: dateStr(new Date()) };
  const model = {};
  for (let i = 0; i < st.length; i += 10) {
    const chunk = st.slice(i, i + 10);
    const q = new URLSearchParams({
      latitude: chunk.map(s => s.lat).join(","), longitude: chunk.map(s => s.lon).join(","),
      hourly: "wind_gusts_10m", models: "icon_d2,meteoswiss_icon_ch2", timezone: "Europe/Vienna", ...range,
    });
    const res = await getJSON("https://historical-forecast-api.open-meteo.com/v1/forecast?" + q, 2);
    (Array.isArray(res) ? res : [res]).forEach((r, j) => {
      if (r?.hourly?.time) model[chunk[j].id] = { time: r.hourly.time, d2: r.hourly.wind_gusts_10m_icon_d2 || [], ch2: r.hourly.wind_gusts_10m_meteoswiss_icon_ch2 || [] };
    });
  }
  const hist = await historyAll(R, (DAYS + 1) * 24, st.map(s => s.id), true);
  const stations = st.map(s => ({ id: s.id, name: s.name, elev: s.elev, role: s.role, ...((model[s.id] && verifyStation(model[s.id], hist[s.id])) ?? { n: 0 }) }));
  return { days: DAYS, hours: [VERIFY.fromHour, VERIFY.toHour], stations, fetchedAt: new Date().toISOString() };
}, {
  maxAge: 6 * 3600,
  swr: false,
  getKey: (event) => `verify:${getRouterParam(event, "id")}:${Math.floor(Date.now() / (6 * 3600e3))}`,   // 6-h-Fenster
});
