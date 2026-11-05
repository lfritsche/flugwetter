// Windfeld für die Karte: grobes Raster mit 10-m-Wind, 1 Stunde gecacht
import { regionBBox, gridPoints } from "#shared/mapgeo";
import { getJSON, OM_LIVE } from "../../utils/weather";

const N = 6;
export default defineCachedEventHandler(async (event) => {
  const R = getRegion(getRouterParam(event, "id"));
  const bbox = regionBBox(R), pts = gridPoints(bbox, N);
  const q = new URLSearchParams({
    latitude: pts.map(p => p.lat).join(","), longitude: pts.map(p => p.lon).join(","),
    hourly: "wind_speed_10m,wind_direction_10m", forecast_days: "3", timezone: "Europe/Vienna",
  });
  const arr: any = await getJSON(OM_LIVE + q);
  const time = arr[0].hourly.time, r1 = (x: number) => Math.round(x * 10) / 10;
  const comp = (fn: (s: number, d: number) => number) => time.map((_: string, t: number) => arr.map((a: any) => {
    const s = a.hourly.wind_speed_10m[t], d = a.hourly.wind_direction_10m[t];
    return s == null || d == null ? null : r1(fn(s, d * Math.PI / 180));
  }));
  // u nach Osten, v nach Norden, in km/h. Richtung ist die Herkunft, daher negativ.
  return { bbox, n: N, time, u: comp((s, d) => -s * Math.sin(d)), v: comp((s, d) => -s * Math.cos(d)) };
}, { maxAge: 3600, swr: false, getKey: (event) => `windgrid:${getRouterParam(event, "id")}` });
