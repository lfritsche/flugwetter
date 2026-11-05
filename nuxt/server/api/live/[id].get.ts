// Live-Messwerte der Stationen einer Region, 2 Minuten gecacht
import { PROVIDERS } from "../../utils/weather";

export default defineCachedEventHandler(async (event) => {
  const R = getRegion(getRouterParam(event, "id"));
  return { ...(await PROVIDERS[R.stationProvider].live(R)), fetchedAt: new Date().toISOString() };
}, { maxAge: 120, swr: false, getKey: (event) => `live:${getRouterParam(event, "id")}` });
