// Modell-Trefferquote: Böen aus ICON-D2 und ICON-CH2 am Stationsort gegen die Messung.
// Messwerte sind nach Intervallbeginn verschlüsselt ("10:00" = 10:00–11:00), Open-Meteo-Böen nach Intervallende.
// Deshalb wird die Messung von 10:00 mit dem Modellwert von 11:00 verglichen.
// @ts-nocheck

export const VERIFY = { fromHour: 10, toHour: 16, yellow: 18, red: 25 };
const cls = v => v <= VERIFY.yellow ? 0 : v <= VERIFY.red ? 1 : 2;
const nextHour = k => {
  const d = new Date(k.slice(0, 10) + "T00:00:00Z");
  const h = +k.slice(11, 13) + 1;
  if (h < 24) return `${k.slice(0, 11)}${String(h).padStart(2, "0")}:00`;
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10) + "T00:00";
};
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const max = (a, b) => a == null ? b : b == null ? a : Math.max(a, b);
const avg = (a, b) => a == null ? b : b == null ? a : (a + b) / 2;

/** model: { time:[], d2:[], ch2:[] } (Böen km/h, Ortszeit) · meas: { "YYYY-MM-DDTHH:00": { ffx } } */
export function verifyStation(model, meas) {
  const idx = new Map(model.time.map((t, i) => [t, i]));
  const rows = [];
  for (const [k, m] of Object.entries(meas || {})) {
    const h = +k.slice(11, 13);
    if (h < VERIFY.fromHour || h > VERIFY.toHour || m?.ffx == null) continue;
    const i = idx.get(nextHour(k));
    if (i == null) continue;
    const d2 = model.d2[i], ch2 = model.ch2[i];
    if (d2 == null && ch2 == null) continue;
    rows.push({ day: k.slice(0, 10), obs: m.ffx, d2, ch2, strict: max(d2, ch2), mean: avg(d2, ch2) });
  }
  if (!rows.length) return null;
  const bias = key => mean(rows.filter(r => r[key] != null).map(r => r[key] - r.obs));
  const strong = rows.filter(r => r.obs > VERIFY.red);
  const days = [...new Set(rows.map(r => r.day))].sort().map(day => {
    const rs = rows.filter(r => r.day === day);
    return { day, bias: mean(rs.map(r => r.strict - r.obs)), biasMean: mean(rs.map(r => r.mean - r.obs)), obsMax: Math.max(...rs.map(r => r.obs)) };
  });
  return {
    n: rows.length,
    obs: mean(rows.map(r => r.obs)),
    bias: { d2: bias("d2"), ch2: bias("ch2"), strict: bias("strict"), mean: bias("mean") },
    // gleiche Ampelstufe wie gemessen (≤18 / ≤25 / >25); strict = schlechteres Modell, mean = Mittel (ab Erfahren)
    hit: { strict: rows.filter(r => cls(r.strict) === cls(r.obs)).length / rows.length, mean: rows.filter(r => cls(r.mean) === cls(r.obs)).length / rows.length },
    strong: strong.length,
    missed: { strict: strong.filter(r => r.strict <= VERIFY.red).length, mean: strong.filter(r => r.mean <= VERIFY.red).length },
    falseRed: { strict: rows.filter(r => r.strict > VERIFY.red && r.obs <= VERIFY.red).length, mean: rows.filter(r => r.mean > VERIFY.red && r.obs <= VERIFY.red).length },
    days,
  };
}
