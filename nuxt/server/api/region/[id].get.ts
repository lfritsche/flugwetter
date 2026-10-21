// Prognose, Föhn und Stationsverlauf einer Region, 10 Minuten gecacht
import { fetchForecast, fetchFoehn, PROVIDERS, OM_LIVE, MODELS_LIVE } from "../../utils/weather";

export default defineCachedEventHandler(async (event) => {
  const R = getRegion(getRouterParam(event, "id"));
  const days = Number(getQuery(event).days) === 7 ? 7 : 3;
  const { data, errors } = await settle({
    fc: fetchForecast(R, OM_LIVE, { past_days: "1", forecast_days: String(days) }, MODELS_LIVE),
    foehn: fetchFoehn(R, OM_LIVE, { forecast_days: String(days) }),
    hist: PROVIDERS[R.stationProvider].history(R, 36),
  });
  return { ...data, errors, days, fetchedAt: new Date().toISOString() };
}, {
  maxAge: 600,
  swr: true,
  getKey: (event) => `region:${getRouterParam(event, "id")}:${Number(getQuery(event).days) === 7 ? 7 : 3}`,
});
