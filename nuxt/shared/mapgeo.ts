// @ts-nocheck
// Reine Rechenfunktionen für die 3D-Karte (ohne Browser-Abhängigkeit, damit testbar).

/** Rahmen um alle Start- und Landeplätze einer Region */
export function regionBBox(R, pad = 0.03) {
  const pts = R.SITES.flatMap(s => [s, s.landing, ...(s.launches || []).filter(l => l.lat != null)]);
  const lats = pts.map(p => p.lat), lons = pts.map(p => p.lon);
  return { s: Math.min(...lats) - pad, n: Math.max(...lats) + pad, w: Math.min(...lons) - pad, e: Math.max(...lons) + pad };
}
/** Regelmäßiges Raster, zeilenweise von Süd nach Nord */
export function gridPoints(b, n = 6) {
  const out = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    out.push({ lat: +(b.s + (b.n - b.s) * j / (n - 1)).toFixed(4), lon: +(b.w + (b.e - b.w) * i / (n - 1)).toFixed(4) });
  }
  return out;
}
/** Bilinear im Raster, field = Array je Rasterpunkt. Außerhalb: null. */
export function gridAt(b, n, field, lon, lat) {
  const x = (lon - b.w) / (b.e - b.w) * (n - 1), y = (lat - b.s) / (b.n - b.s) * (n - 1);
  if (x < 0 || y < 0 || x > n - 1 || y > n - 1) return null;
  const i = Math.min(Math.floor(x), n - 2), j = Math.min(Math.floor(y), n - 2), fx = x - i, fy = y - j;
  const v = (a, c) => field[c * n + a];
  const corners = [v(i, j), v(i + 1, j), v(i, j + 1), v(i + 1, j + 1)];
  if (corners.some(c => c == null)) return null;
  return corners[0] * (1 - fx) * (1 - fy) + corners[1] * fx * (1 - fy) + corners[2] * (1 - fx) * fy + corners[3] * fx * fy;
}
const R_EARTH = 6371000, rad = d => d * Math.PI / 180;
export function distM(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon) * Math.cos(rad((a.lat + b.lat) / 2));
  return Math.hypot(dLat, dLon) * R_EARTH;
}
export function bearing(a, b) {
  const dLat = b.lat - a.lat, dLon = (b.lon - a.lon) * Math.cos(rad((a.lat + b.lat) / 2));
  return (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
}
/** Windsektor als Polygon. sector = [von, bis] im Uhrzeigersinn, Grad aus denen der Wind kommt. */
export function fanPolygon(lat, lon, sector, radiusM = 900, steps = 16) {
  const [a, b] = sector, span = ((b - a) + 360) % 360 || 360;
  const ring = span >= 360 ? [] : [[lon, lat]];
  for (let k = 0; k <= steps; k++) {
    const d = rad(a + span * k / steps);
    ring.push([lon + (radiusM * Math.sin(d) / R_EARTH) * 180 / Math.PI / Math.cos(rad(lat)), lat + (radiusM * Math.cos(d) / R_EARTH) * 180 / Math.PI]);
  }
  ring.push(ring[0]);
  return ring;
}
/** Grobe Gleitrechnung Start → Landeplatz: Eigengleiten plus Windanteil auf der Strecke, gegen das Gelände geprüft.
    samples: [{ d: Meter ab Start, h: Gelände in m }]. Keine Thermik, kein Lee, keine Volte. */
export const GLIDE = { ratio: 7, trim: 38, skipM: 400, red: { clearance: 50, reserve: 100 }, yellow: { clearance: 150, reserve: 250 } };
export function glidePath({ start, land, wind, samples }) {
  const dist = distM(start, land), track = bearing(start, land);
  const tail = wind && wind.speed != null && wind.dir != null ? wind.speed * Math.cos(rad(track - (wind.dir + 180))) : 0;
  const ground = GLIDE.trim + tail;
  if (ground <= 3) return { dist, tail, level: 2, reserve: null, clearance: null, reason: "Gegenwind zu stark" };
  const eff = GLIDE.ratio * ground / GLIDE.trim, altAt = d => start.elev - d / eff;
  const reserve = altAt(dist) - land.elev;
  let clearance = Infinity, worstAt = null;
  for (const p of samples || []) {
    if (p.d < GLIDE.skipM || p.h == null) continue;
    const c = altAt(p.d) - p.h;
    if (c < clearance) { clearance = c; worstAt = p.d; }
  }
  if (clearance === Infinity) clearance = null;
  const bad = lim => reserve < lim.reserve || (clearance != null && clearance < lim.clearance);
  const level = bad(GLIDE.red) ? 2 : bad(GLIDE.yellow) ? 1 : 0;
  return { dist, tail, eff, reserve, clearance, worstAt, level, reason: reserve < GLIDE.red.reserve ? "Landeplatz knapp oder nicht erreichbar" : clearance != null && clearance < GLIDE.red.clearance ? "Gelände auf der Strecke im Weg" : null };
}
/** Obergrenze der Nebelschicht aus den Punkten einer Stunde: grob, nur aus Start- und Landeplätzen. */
export function fogTopFrom(points) {
  const fogged = points.filter(p => p.fog).map(p => p.elev), clear = points.filter(p => p.fog === false).map(p => p.elev);
  if (!fogged.length) return null;
  const top = Math.max(...fogged) + 120;
  const above = clear.filter(c => c > Math.max(...fogged));
  return above.length ? Math.min(top, Math.min(...above) - 30) : top;
}
/** Farbausdruck für die Höhenfärbung: Nebel unten, Wolken oben. Null = nichts anzeigen. */
export function reliefColor({ fogTop, cloudBase }) {
  const none = "rgba(255,255,255,0)", fog = "rgba(245,248,250,0.82)", cloud = "rgba(232,238,243,0.72)";
  const useFog = fogTop != null, useCloud = cloudBase != null && (!useFog || cloudBase > fogTop + 200);
  if (!useFog && !useCloud) return null;
  const stops = [];
  if (useFog) stops.push(-100, fog, fogTop, fog, fogTop + 60, none); else stops.push(-100, none);
  if (useCloud) stops.push(cloudBase - 30, none, cloudBase + 70, cloud, 9000, cloud); else stops.push(9000, none);
  return ["interpolate", ["linear"], ["elevation"], ...stops];
}
