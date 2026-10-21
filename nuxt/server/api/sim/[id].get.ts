// Rückblick: vergangene Modellläufe (Open-Meteo Historical Forecast) + Stationsverlauf, 6 Stunden gecacht
import { fetchForecast, fetchFoehn, PROVIDERS, OM_HIST, MODELS_SIM } from "../../utils/weather";
import { dateStr } from "#shared/format";

export default defineCachedEventHandler(async (event) => {
  const R = getRegion(getRouterParam(event, "id"));
  const n = Math.max(7, Math.min(90, Number(getQuery(event).days) || 30));
  const end = new Date(Date.now() - 864e5), start = new Date(Date.now() - (n + 1) * 864e5);   // ein Tag Vorlauf
  const range = { start_date: dateStr(start), end_date: dateStr(end) };
  const { data, errors } = await settle({
    fc: fetchForecast(R, OM_HIST, range, MODELS_SIM),
    foehn: fetchFoehn(R, OM_HIST, range),
    hist: PROVIDERS[R.stationProvider].history(R, (n + 2) * 24),
  });
  if (!data.fc) throw createError({ statusCode: 502, statusMessage: errors.fc || "Rückblick nicht verfügbar" });
  return { ...data, errors, days: n, fetchedAt: new Date().toISOString() };
}, {
  maxAge: 6 * 3600,
  getKey: (event) => `sim:${getRouterParam(event, "id")}:${Number(getQuery(event).days) || 30}:${new Date().toISOString().slice(0, 10)}`,
});
