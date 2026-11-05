// Live-Messwerte und Föhn-Signale einer Region, 2 Minuten gecacht
import { PROVIDERS, fetchFoehnSamples } from "../../utils/weather";

export default defineCachedEventHandler(async (event) => {
  const R = getRegion(getRouterParam(event, "id"));
  const { data, errors } = await settle({ live: PROVIDERS[R.stationProvider].live(R), foehn: fetchFoehnSamples(R) });
  const f: any = data.foehn;
  return { ...((data.live as object) || { ts: null, st: {} }), foehnSamples: f?.samples || {}, foehnFailed: f?.failed || (errors.foehn ? ["alle"] : []), errors, fetchedAt: new Date().toISOString() };
}, { maxAge: 120, swr: false, getKey: (event) => `live:${getRouterParam(event, "id")}` });
