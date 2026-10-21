// Portiert aus der statischen Version (app.js). Funktionen arbeiten auf einem Kontext,
// der per setCtx() gesetzt wird: Einstellungen S, Daten DATA, Region R, Auswahl SEL, Auswertung EVAL.
/* eslint-disable */
// @ts-nocheck
export const DIRS = ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const compassName = d => DIRS[Math.round((d % 360) / 22.5) % 16];
export function fmt(v, unit) {
  if (v == null) return "–";
  const n = unit === "mm/h" || unit === "hPa" ? (Math.round(v * 10) / 10).toLocaleString("de-AT") : Math.round(v).toLocaleString("de-AT");
  return unit ? `${n} ${unit}` : n;
}
export const TZF = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false });
export const localKey = d => TZF.format(d).replace(" ", "T").slice(0, 13) + ":00";
export const nowLocalKey = () => localKey(new Date());
export function dayParts(key) {
  const d = new Date(key + "T12:00:00");
  return { wd: d.toLocaleDateString("de-AT", { weekday: "short" }), wdl: d.toLocaleDateString("de-AT", { weekday: "long" }), dm: d.toLocaleDateString("de-AT", { day: "numeric", month: "numeric" }), dow: (d.getDay() + 6) % 7, dnum: d.getDate() };
}
export function dayName(idx, key, sim = false) {
  if (sim) { const p = dayParts(key); return `${p.wd} ${p.dm}`; }
  return ["Heute", "Morgen", "Übermorgen"][idx] || dayParts(key).wdl;
}
export const LEVEL_TXT = ["fliegbar", "grenzwertig", "nicht fliegbar"];
export const lvClass = l => l == null ? "lx" : "l" + l;
export const keyOf = (day, hour) => `${day}T${String(hour).padStart(2, "0")}:00`;
export const prevDay = key => { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() - 1); return dateStr(d); };
export const dateStr = (d: Date) => localKey(d).slice(0, 10);
export function hourRanges(a) {
  if (!a.length) return "";
  const segs = []; let st = a[0], pr = a[0];
  a.slice(1).concat(null).forEach(x => { if (x === pr + 1) { pr = x; return; } segs.push(st === pr ? `${st}` : `${st}–${pr + 1}`); st = pr = x; });
  return (segs.length > 1 ? segs.slice(0, -1).join(", ") + " und " + segs[segs.length - 1] : segs[0]) + " Uhr";
}
/* Klartext-Stufen für die einfache Ansicht */
