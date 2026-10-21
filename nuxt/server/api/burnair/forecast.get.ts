// Burnair-Punktprognose für alle Startplätze einer Region (bis 3 Tage), nur mit gültigem Login
import { decodeBurnair } from "#shared/engine";
import { dateStr } from "#shared/format";

export default defineEventHandler(async (event) => {
  requireBurnairEnabled();
  await requireBurnair(getHeader(event, "authorization"));
  const R = getRegion(String(getQuery(event).region || ""));
  const days = Math.min(3, Math.max(1, Number(getQuery(event).days) || 3));
  const dates = Array.from({ length: days }, (_, i) => dateStr(new Date(Date.now() + i * 864e5)));
  const out: Record<string, unknown> = {};
  await Promise.all(R.SITES.map(async (s: any) => {
    const parts = await Promise.all(dates.map(async d => decodeBurnair(await burnairPointForecast(s.lat, s.lon, d), s.elev)));
    out[s.id] = { model: parts[0].model, hsurf: parts[0].hsurf, hours: Object.assign({}, ...parts.map((p: any) => p.hours)) };
  }));
  return out;
});
