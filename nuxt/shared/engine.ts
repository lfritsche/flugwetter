// Portiert aus der statischen Version (app.js). Funktionen arbeiten auf einem Kontext,
// der per setCtx() gesetzt wird: Einstellungen S, Daten DATA, Region R, Auswahl SEL, Auswertung EVAL.
/* eslint-disable */
// @ts-nocheck
import { LEVELS, BEGINNER_STRICT, PSEUDO, XC, MODES, makeParams } from "./config";
import { compassName, fmt, localKey, nowLocalKey, dayParts, dayName as dayNameRaw, LEVEL_TXT, lvClass, keyOf, prevDay, dateStr, hourRanges } from "./format";

export let S, DATA, R, FOEHN, SITES, STATIONS, STATION_NAME, SEL, EVAL, PARAMS;
/** Kontext setzen (Client: reaktive Objekte; Server/Cron: einfache Objekte) */
export function setCtx(c) {
  S = c.S; DATA = c.DATA; R = c.R; SEL = c.SEL || { dayIdx: 0, hour: null }; EVAL = c.EVAL || {};
  FOEHN = R.foehn; SITES = R.SITES; STATIONS = R.STATIONS;
  STATION_NAME = Object.fromEntries(STATIONS.map(s => [s.id, s.name]));
  PARAMS = makeParams(FOEHN);
}
export const site = () => SITES.find(s => s.id === S.tab);
export const curDay = () => { const ev = EVAL[S.tab]; return ev && (ev.days[SEL.dayIdx] || ev.days[0]); };
export const dayName = (idx, key) => dayNameRaw(idx, key, isSim());

export const mx = (...v) => { const f = v.filter(x => x != null); return f.length ? Math.max(...f) : null; };
export const mn = (...v) => { const f = v.filter(x => x != null); return f.length ? Math.min(...f) : null; };
export const at = (h, k, m, i) => { const a = h[k + "_" + m]; return a ? a[i] : null; };
export const inSector = (dir, [a, b]) => a <= b ? dir >= a && dir <= b : dir >= a || dir <= b;
export const angDist = (x, y) => { const d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; };
export function hourBuckets(samples) {   // samples: [{t: Date, dir, ff, ffx}]
  const buckets = {};
  samples.forEach(x => {
    if (x.ff == null) return;
    const k = localKey(x.t);
    const b = buckets[k] = buckets[k] || { u: 0, w: 0, s: 0, g: 0, n: 0 };
    const rad = (x.dir ?? 0) * Math.PI / 180;
    b.u += Math.sin(rad) * x.ff; b.w += Math.cos(rad) * x.ff; b.s += x.ff; b.g = Math.max(b.g, x.ffx ?? 0); b.n++;
  });
  const out = {};
  Object.entries(buckets).forEach(([k, b]) => out[k] = { ff: b.s / b.n, ffx: b.g, dir: (Math.atan2(b.u, b.w) * 180 / Math.PI + 360) % 360 });
  return out;
}
export function decodeBurnair(d, elev) {
  const V = d.data_vars, val = (k, x) => (x == null || x === V[k].attrs._FillValue) ? null : x * (V[k].attrs.scale_factor || 1);
  const hhl = V["hhl-ml"].data.map(x => val("hhl-ml", x));          // MSL, von oben nach unten
  const hsurf = val("hsurf-sl", V["hsurf-sl"].data);
  const at1 = (k, ti) => V[k] ? val(k, V[k].data[ti]) : null;
  const windAt = (alt, ti) => {
    const ws = V["wind_strength-ml"].data, wd = V["wind_direction-ml"].data, n = hhl.length;
    let lo = n - 1;                                                   // unterste Schicht
    if (alt <= hhl[n - 1]) return { ws: val("wind_strength-ml", ws[n - 1][ti]), wd: val("wind_direction-ml", wd[n - 1][ti]), below: true };
    for (let i = n - 1; i > 0; i--) if (hhl[i - 1] >= alt) { lo = i; break; }
    const hi = lo - 1, f = (alt - hhl[lo]) / (hhl[hi] - hhl[lo]);
    const vec = i => { const s = val("wind_strength-ml", ws[i][ti]), r = val("wind_direction-ml", wd[i][ti]) * Math.PI / 180; return [s * Math.sin(r), s * Math.cos(r)]; };
    const a = vec(lo), b = vec(hi), u = a[0] + (b[0] - a[0]) * f, v = a[1] + (b[1] - a[1]) * f;
    return { ws: Math.hypot(u, v), wd: (Math.atan2(u, v) * 180 / Math.PI + 360) % 360, below: false };
  };
  const out = {};
  d.coords.valid_time.data.forEach((ts, ti) => {
    const w = windAt(elev, ti), cb = at1("cloudbase-sl", ti), top = at1("htop_dc-sl", ti);
    out[localKey(new Date(ts * 1000))] = {
      ws: w.ws, wd: w.wd, belowModel: w.below, gust: at1("vmax_10m-sl", ti), rain: at1("tot_prec-sl", ti),
      cloudBase: cb && cb > 0 && cb < 15000 ? hsurf + cb : null,
      blh: top && top > hsurf ? top - hsurf : (top === 0 ? 0 : null),
      w850: windAt(1500, ti), w700: windAt(3000, ti),
    };
  });
  return { model: d.attrs.model, hsurf, hours: out };
}
export function annotateTrends(hours) {
  const byT = {}; hours.forEach(h => byT[h.t] = h);
  const shift = (t, dh) => localKey(new Date(new Date(t + ":00").getTime() + dh * 3600e3));
  hours.forEach(h => {
    const f3 = byT[shift(h.t, 3)], p3 = byT[shift(h.t, -3)];
    h.foehnTrend = f3 && f3.foehn != null && h.foehn != null ? f3.foehn - h.foehn : null;
    h.dp3 = p3 && p3.pmsl != null && h.pmsl != null ? h.pmsl - p3.pmsl : null;   // Druckanstieg in 3 h
  });
  return hours;
}
export function buildHours(site, fc, foehn, hist) {
  const L = fc.launch, G = fc.land;
  const meas = site.measureStation && hist && hist[site.measureStation];
  const measName = site.measureStation && (STATION_NAME[site.measureStation] || site.measureStation);
  const nowKey = isSim() ? "9999" : nowLocalKey();
  return L.time.map((t, i) => {
    const wD2 = at(L, "wind_speed_10m", "icon_d2", i), wCH = at(L, "wind_speed_10m", "meteoswiss_icon_ch2", i);
    const gD2 = at(L, "wind_gusts_10m", "icon_d2", i), gCH = at(L, "wind_gusts_10m", "meteoswiss_icon_ch2", i);
    // Hochauflösend zuerst (schlechterer Wert), danach Fallback auf ICON-EU / ECMWF
    const fine = wD2 != null || wCH != null;
    const wEU = at(L, "wind_speed_10m", "icon_eu", i), wEC = at(L, "wind_speed_10m", "ecmwf_ifs025", i);
    let windLaunch = fine ? mx(wD2, wCH) : mx(wEU, wEC);
    let gust = fine ? mx(gD2, gCH) : mx(at(L, "wind_gusts_10m", "icon_eu", i), at(L, "wind_gusts_10m", "ecmwf_ifs025", i));
    let dir;
    if (fine) dir = (wD2 != null && (wCH == null || wD2 >= wCH)) ? at(L, "wind_direction_10m", "icon_d2", i) : at(L, "wind_direction_10m", "meteoswiss_icon_ch2", i);
    else dir = at(L, "wind_direction_10m", "icon_eu", i) ?? at(L, "wind_direction_10m", "ecmwf_ifs025", i);
    // Burnair (falls angemeldet): Wind auf Starthöhe aus den Modellschichten
    const ba = !isSim() && DATA.burnair && DATA.burnair[site.id] ? DATA.burnair[site.id].hours[t] : null;
    if (ba && ba.ws != null) { windLaunch = ba.ws; dir = ba.wd; if (ba.gust != null) gust = ba.gust; }
    // Messung schlägt Modell: Modelle treffen den Bodenwind in engen Tälern oft nicht
    let m = meas && t <= nowKey ? meas[t] : null;
    if (!m && site.measureStation && t === nowKey && DATA.live && DATA.live.st[site.measureStation] && DATA.live.st[site.measureStation].ff != null) m = DATA.live.st[site.measureStation];
    // Talstation (Rolle "landing") ersetzt nur den Landewind, nie den Wind am Start
    const mLand = m && site.measureRole === "landing" ? m : null;
    if (mLand) m = null;
    const model = m ? { dir, windLaunch, gust } : null;
    if (m) { dir = m.dir; windLaunch = m.ff; gust = m.ffx; }
    const landFine = mx(at(G, "wind_speed_10m", "icon_d2", i), at(G, "wind_speed_10m", "meteoswiss_icon_ch2", i));
    const cb = at(L, "cloud_base", "meteoswiss_icon_ch2", i);
    const cloudBase = ba ? ba.cloudBase : (cb == null || cb > 15000 ? null : cb);   // >15 km = keine Wolke
    const f = foehn && foehn.byTime[t];
    const firstOf = (k, ms) => { for (const m of ms) { const v = at(L, k, m, i); if (v != null) return v; } return null; };
    const upper = ["icon_d2", "icon_eu", "ecmwf_ifs025", "gfs_seamless"];
    return {
      t, day: t.slice(0, 10), hour: +t.slice(11, 13), sun: fc.sun ? fc.sun[t.slice(0, 10)] : null,
      windLaunch, gust, dir,
      spread: windLaunch != null && gust != null ? Math.max(0, gust - windLaunch) : null,
      windLand: mLand ? mLand.ff : landFine ?? mx(at(G, "wind_speed_10m", "icon_eu", i), at(G, "wind_speed_10m", "ecmwf_ifs025", i)),
      landMeasured: mLand ? measName : null,
      vis: mn(at(L, "visibility", "icon_d2", i), at(L, "visibility", "gfs_seamless", i)),
      wx: mx(at(L, "weather_code", "icon_d2", i), at(L, "weather_code", "meteoswiss_icon_ch2", i)),
      pmsl: at(L, "pressure_msl", "icon_d2", i) ?? at(L, "pressure_msl", "meteoswiss_icon_ch2", i) ?? at(L, "pressure_msl", "gfs_seamless", i),
      w850: ba && !ba.w850.below ? ba.w850.ws : firstOf("wind_speed_850hPa", upper), d850: ba && !ba.w850.below ? ba.w850.wd : firstOf("wind_direction_850hPa", upper),
      w700: ba ? ba.w700.ws : firstOf("wind_speed_700hPa", upper), d700: ba ? ba.w700.wd : firstOf("wind_direction_700hPa", upper),
      dirLand: at(G, "wind_direction_10m", "icon_d2", i) ?? at(G, "wind_direction_10m", "meteoswiss_icon_ch2", i) ?? at(G, "wind_direction_10m", "icon_eu", i),
      cape: mx(at(L, "cape", "icon_d2", i), at(L, "cape", "meteoswiss_icon_ch2", i)) ?? mx(at(L, "cape", "icon_eu", i), at(L, "cape", "ecmwf_ifs025", i), at(L, "cape", "gfs_seamless", i)),
      li: at(L, "lifted_index", "gfs_seamless", i),
      rain: ba && ba.rain != null ? ba.rain : mx(at(L, "precipitation", "icon_d2", i), at(L, "precipitation", "meteoswiss_icon_ch2", i)) ?? mx(at(L, "precipitation", "icon_eu", i), at(L, "precipitation", "ecmwf_ifs025", i)),
      cloudBase, cloud: cloudBase == null ? null : Math.round(cloudBase - site.elev),
      lowCloud: mx(at(L, "cloud_cover_low", "icon_d2", i), at(L, "cloud_cover_low", "meteoswiss_icon_ch2", i)),
      blh: ba && ba.blh != null ? ba.blh : at(L, "boundary_layer_height", "gfs_seamless", i),
      foehn: f ? (FOEHN.combine === "max" ? mx(f.bi, f.lz) : (f.bi ?? f.lz)) : null,
      lowConf: wD2 == null && !m && !ba,
      burnair: ba ? (DATA.burnair[site.id].model || "burnair") : null, baBelow: ba ? ba.belowModel : false,
      measured: m ? measName : null, model,
      modelGustDiff: !m && !ba && gD2 != null && gCH != null ? Math.abs(gD2 - gCH) : null,
    };
  });
}

/* Modell-Check: lag das Modell in den letzten gemessenen Stunden bei der Richtung daneben,
   gilt seine Richtung für die nächsten 12 Stunden als unsicher (höchstens gelb). */
export function modelCheck(site, hours) {
  if (isSim()) return;
  const calm = S.extra.calmWind;
  // erst ab 10 Uhr vergleichen: morgens herrscht oft Bergwind, den Modelle nicht abbilden
  const checked = hours.filter(h => h.measured && h.model && h.model.dir != null && h.hour >= 10).slice(-5);
  const wrong = checked.filter(h => {
    const mod = h.model;
    if (h.windLaunch > 8 && h.windLaunch > 1.5 * (mod.windLaunch || 0)) return true;   // real deutlich stärker
    if (mod.windLaunch < calm && h.windLaunch < calm) return false;            // beide ruhig
    if (mod.windLaunch >= calm && h.windLaunch < calm) return true;            // Modell Wind, real ruhig
    if (mod.windLaunch < calm && h.windLaunch >= calm) return true;
    return angDist(mod.dir, h.dir) > 60;
  });
  if (checked.length < 2 || wrong.length < 2) return;
  const last = checked[checked.length - 1];
  const info = `${wrong.length} von ${checked.length} Stunden`;
  let n = 0;
  hours.forEach(h => { if (h.t > last.t && !h.measured && n < 12) { h.dirSuspect = info; n++; } });
}
export function grade(v, lim, invert) {
  if (v == null) return null;
  if (invert) return v >= lim.g ? 0 : v >= lim.r ? 1 : 2;
  return v <= lim.g ? 0 : v <= lim.r ? 1 : 2;
}
/* Richtung: 0 optimal, 1 fliegbar/Rand, 2 falsch, -1 windstill, null keine Daten */
export function sectorGrade(l, dir) {
  let g;
  if (inSector(dir, l.sector)) g = 0;
  else if (l.sectorWide) g = inSector(dir, l.sectorWide) ? 1 : 2;
  else g = Math.min(angDist(dir, l.sector[0]), angDist(dir, l.sector[1])) <= S.extra.dirTol ? 1 : 2;
  // maxLevelBeginner: Startplatz für Anfänger/Fortgeschrittene höchstens gelb (z. B. schwierige Landung)
  if (l.capYellow && levelIdx() <= 1 && g === 0) g = 1;
  return g;
}
/* Mehrere Startplätze (site.launches): bester passender Start pro Stunde */
export function dirPick(site, dir, speed) {
  if (dir == null || speed == null) return { g: null, launch: null };
  const ls = site.launches || [site];
  if (speed < S.extra.calmWind) return { g: -1, launch: site.launches ? ls.find(l => l.calmOk) || ls[0] : null };
  let best = null;
  ls.forEach(l => { const g = sectorGrade(l, dir); if (!best || g < best.g) best = { g, launch: site.launches ? l : null }; });
  return best;
}
export const dirGrade = (site, dir, speed) => dirPick(site, dir, speed).g;

export function scoreHour(hr, site) {
  const reasons = [], grades = {};
  const push = (key, label, level, value, limText, weight, key2) => {
    reasons.push({ key, label, level, value, limText, weight, key2: !!key2 });
    grades[key] = level;
  };
  PARAMS.forEach(p => {
    const lim = S.limits[p.key], v = hr[p.key];
    let lv = grade(v, lim, p.invert);
    if (p.key === "cloud" && lv != null && hr.lowCloud != null && hr.lowCloud >= 90 && v < lim.r) lv = 2;
    // Hike & Fly: 700 hPa (~3000 m) liegt über der Flughöhe, starke Thermik nur Hinweis → höchstens gelb
    if (S.flight === "hf" && ((p.key === "w700" && site.elev < 1800) || p.key === "blh") && lv === 2) lv = 1;
    // Region kann Föhn für Anfänger früher rot machen (z. B. Nordföhn-Durchbruch ab 3 hPa)
    if (p.key === "foehn" && v != null && FOEHN.beginnerRed != null && levelIdx() <= 1 && v >= FOEHN.beginnerRed) lv = 2;
    // Föhn nimmt in den nächsten 3 h um ≥1 hPa zu → eine Stufe schlechter
    if (p.key === "foehn" && lv != null && lv < 2 && v >= lim.g && hr.foehnTrend >= 1) lv++;
    // Thermik/Strecke: hohe Grenzschicht und Basis sind erwünscht; zu wenig davon = gelb ("kaum Thermik")
    if (S.flight === "xc" && p.key === "blh" && v != null) lv = v >= XC.blhGood ? 0 : 1;
    if (S.flight === "xc" && p.key === "cloud" && lv === 0 && v != null && v < XC.baseGood) lv = 1;
    // Böigkeit zählt erst, wenn die Böen selbst über grün liegen (sonst Artefakt bei Windstille)
    if (p.key === "spread" && lv != null && hr.gust != null && hr.gust <= S.limits.gust.g) lv = 0;
    push(p.key, p.label, lv, v == null ? null : fmt(v, p.unit), p.invert ? `≥${lim.g} / <${lim.r}` : `≤${lim.g} / >${lim.r}`, p.weight, p.key2);
  });
  const pick = dirPick(site, hr.dir, hr.windLaunch), dg = pick.g;
  if (dg != null) {
    // unsichere Modellrichtung macht nichts freundlicher, nur gelb → bleibt gelb, grün → gelb
    const lvDir = hr.dirSuspect && dg === 0 ? 1 : Math.max(0, dg);
    const lname = pick.launch ? ` → Start ${pick.launch.name}` : "";
    push("dir", PSEUDO.dir.label + (hr.dirSuspect ? " (Modell unsicher)" : ""), lvDir, (dg === -1 ? "windstill" : `${compassName(hr.dir)} ${Math.round(hr.dir)}°`) + lname, pick.launch ? pick.launch.sectorLabel : site.sectorLabel, PSEUDO.dir.weight, true);
  }
  const month = +hr.day.slice(5, 7);
  // Tageslicht: Stunde muss mind. 30 min nach Sonnenaufgang beginnen und 30 min vor Sonnenuntergang enden
  if (hr.sun) {
    const fmtT = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
    if ((hr.hour + 1) * 60 > hr.sun.set - 30) push("dark", "Tageslicht", 2, `Sonnenuntergang ${fmtT(hr.sun.set)}`, "", 3, true);
    else if (hr.hour * 60 < hr.sun.rise + 30 - 60) push("dark", "Tageslicht", 2, `Sonnenaufgang ${fmtT(hr.sun.rise)}`, "", 3, true);
  }
  const lvl = levelIdx();
  // Automatisches Lee: Höhenwind kommt von hinten (Gegenrichtung des gewählten Startsektors)
  const sec = (pick.launch || site).sector;
  if (!site.noAutoLee && sec) {
    const center = (sec[0] + ((sec[1] - sec[0] + 360) % 360) / 2) % 360, back = (center + 180) % 360;
    const hi = site.elev >= 1800 ? { w: hr.w700, d: hr.d700, n: "3000 m" } : { w: hr.w850, d: hr.d850, n: "1500 m" };
    if (hi.w != null && hi.d != null && angDist(hi.d, back) <= 60) {
      const y = 10 + 5 * lvl, r = 20 + 5 * lvl;
      if (hi.w >= y) push("lee", "Lee: Höhenwind von hinten", hi.w >= r ? 2 : 1, `${compassName(hi.d)} ${Math.round(hi.w)} km/h (${hi.n})`, `≥${y} / ≥${r}`, PSEUDO.lee.weight, true);
    }
  }
  // Nordföhn-Signal in der Höhe (Region): Nordwind auf 3000 m und Druckgradient
  if (FOEHN.northAloft && hr.w700 >= 25 && hr.d700 != null && inSector(hr.d700, [315, 45]) && hr.foehn >= 1.5)
    push("foehn2", "Föhn-Signal: Nordwind auf 3000 m", 2, `${compassName(hr.d700)} ${Math.round(hr.w700)} km/h`, "≥25 & ≥1,5 hPa", 3, true);
  // Gegenlage: starker Stau auf der anderen Seite
  if (hr.foehn != null && hr.foehn <= -4) push("stau", FOEHN.negName + " (Stau)", 1, fmt(hr.foehn, "hPa"), "≤ −4", 1);
  // Sicht, Gewitter im Modell, Front (Druckanstieg)
  if (hr.vis != null && hr.vis < 5000) push("vis", "Sicht", hr.vis < 1500 ? 2 : 1, `${(hr.vis / 1000).toLocaleString("de-AT", { maximumFractionDigits: 1 })} km`, "<5 / <1,5 km", 2, true);
  if (hr.wx != null && hr.wx >= 95) push("wx", "Gewitter (Modell)", 2, `Code ${hr.wx}`, "", 3, true);
  if (hr.dp3 != null && hr.dp3 >= 2) push("front", "Front: Druckanstieg", hr.dp3 >= 3 ? 2 : 1, `+${hr.dp3.toFixed(1)} hPa/3 h`, "≥2 / ≥3", 2, true);
  (site.rules || []).forEach(rule => {
    if (rule.type === "closed" && rule.months.includes(month)) push("closed", rule.label, 2, "gesperrt", "", PSEUDO.closed.weight, true);
    // closedDates: [["MM-DD","MM-DD"], …] z. B. Bahn außer Betrieb zwischen den Saisonen
    if (rule.type === "closedDates" && rule.ranges.some(([a, b]) => hr.day.slice(5) >= a && hr.day.slice(5) <= b)) push("closed", rule.label, 2, "zu", "", PSEUDO.closed.weight, true);
    // lift: Bergfahrt nur in diesen Stunden möglich (Start bis kurz nach letzter Bergfahrt)
    if (rule.type === "lift" && (hr.hour < rule.hours[0] || hr.hour > rule.hours[1])) push("closed", rule.label, 2, `nur ${rule.hours[0]}–${rule.hours[1] + 1} Uhr`, "", PSEUDO.closed.weight, true);
    if (rule.type === "penalty" && rule.months.includes(month) && hr.hour >= rule.hours[0] && hr.hour <= rule.hours[1]) push("season", rule.label, 1, "Abzug", "", PSEUDO.season.weight);
    if (rule.type === "lee") {
      const up = site.elev >= 1800, w = up ? hr.w700 : hr.w850, d = up ? hr.d700 : hr.d850;
      if (d != null && w >= rule.minSpeed && inSector(d, rule.sector)) push("lee", rule.label, w >= rule.minSpeed * 2 ? 2 : 1, `${compassName(d)} ${Math.round(w)} km/h`, up ? "3000 m" : "1500 m", PSEUDO.lee.weight, true);
    }
  });
  const rated = reasons.filter(r => r.level != null);
  let sumW = 0, sumS = 0;
  rated.forEach(r => { sumW += r.weight * 3; sumS += r.weight * r.level; });
  const ratio = sumW ? sumS / sumW : 1;
  let level;
  if (!rated.length || hr.windLaunch == null) level = null;
  else if (rated.some(r => r.level === 2)) level = 2;                    // jedes Rot = Rot
  else if (ratio < 0.15 && !rated.some(r => (r.key2 || (lvl <= 1 && BEGINNER_STRICT.includes(r.key))) && r.level === 1)) level = 0;
  else level = 1;
  let bumped = false;
  if (level != null && level < 2 && hr.modelGustDiff > S.extra.modelSpread) { level++; bumped = true; }
  reasons.sort((a, b) => (b.level ?? -1) - (a.level ?? -1) || b.weight - a.weight);
  return { level, reasons, grades, ratio, bumped, dirGrade: dg, launch: pick.launch };
}

export const isSim = () => S.mode === "sim";
export function activeData() { return isSim() ? { fc: DATA.simFc, foehn: DATA.simFoehn, hist: DATA.simHist } : { fc: DATA.fc, foehn: DATA.foehn, hist: DATA.hist }; }

export function evaluateSite(site) {
  const A = activeData();
  const hours = annotateTrends(buildHours(site, A.fc[site.id], A.foehn, A.hist));
  modelCheck(site, hours);
  hours.forEach(h => h.score = scoreHour(h, site));
  // Puffer: eine Stunde vor Gewitter, Regen, Föhn oder Front nicht mehr grün
  const HAZ = ["cape", "li", "rain", "foehn", "wx", "front"];
  hours.forEach((h, i) => {
    const nx = hours[i + 1];
    if (h.score.level === 0 && nx && HAZ.some(k => nx.score.grades[k] === 2)) {
      h.score.level = 1;
      const k = HAZ.find(k => nx.score.grades[k] === 2);
      h.score.reasons.unshift({ key: "buffer", label: "Puffer: in 1 h " + (nx.score.reasons.find(r => r.key === k) || {}).label, level: 1, value: "", limText: "", weight: 1 });
      h.score.grades.buffer = 1;
    }
  });
  const today = nowLocalKey().slice(0, 10);
  const byDay = {};
  hours.forEach(h => {
    if ((isSim() ? h.day >= today : h.day < today) || h.hour < S.extra.hourFrom || h.hour > S.extra.hourTo) return;
    (byDay[h.day] = byDay[h.day] || []).push(h);
  });
  let keys = Object.keys(byDay).sort();
  if (!isSim()) keys = keys.slice(0, MODES[S.mode].days);
  else keys = keys.slice(1);   // erster Tag ist nur Vorlauf für den Windverlauf
  const days = keys.map(k => ({ key: k, hours: byDay[k], best: bestWindow(byDay[k]) }));
  days.forEach(d => { d.greenHours = d.hours.filter(h => h.score.level === 0).length; d.bestLevel = mn(...d.hours.map(h => h.score.level)); });
  return { hours, days };
}
export function bestWindow(hours) {
  const nowKey = isSim() ? "" : nowLocalKey();
  for (const lv of [0, 1]) {
    let best = null, cur = null;
    hours.forEach(h => {
      if (h.score.level === lv && h.t >= nowKey) cur = cur ? { ...cur, to: h.hour } : { from: h.hour, to: h.hour, level: lv };
      else cur = null;
      if (cur && (!best || cur.to - cur.from > best.to - best.from)) best = { ...cur };
    });
    if (best) return best;
  }
  return null;
}

export function motto(level, day, future) {
  if (!future.length) return "Tag vorbei.";
  if (level == null) return "Keine Daten.";
  if (level === 0 && future.filter(h => h.score.level === 0).length < 3) return "Nur ein kurzes Fenster.";
  if (level === 0) return levelIdx() <= 1 ? "Laut Modell gut. Am Start prüfen." : ["Ab in die Luft!", "Schirm einpacken!", "Der Startplatz ruft.", "Gute Luft da oben."][day.key.charCodeAt(9) % 4];
  if (level === 1) {
    if (S.flight === "xc" && future.some(h => h.score.grades.blh === 1 && h.blh != null && h.blh < XC.blhGood)) return "Fliegbar, aber kaum Thermik.";
    return "Möglich. Genau hinschauen.";
  }
  const counts = {};
  future.forEach(h => h.score.reasons.forEach(r => { if (r.level === 2) counts[r.key] = (counts[r.key] || 0) + 1; }));
  const PRIO = ["dark", "closed", "foehn", "cape", "li", "rain", "gust", "windLaunch", "spread", "cloud", "windLand", "dir", "w850", "w700", "lee", "blh"];
  const top = Object.entries(counts).sort((a, b) => (PRIO.indexOf(a[0]) + 99) % 99 - (PRIO.indexOf(b[0]) + 99) % 99 || b[1] - a[1])[0];
  return ({ foehn: "Föhn! Heute am Boden bleiben.", rain: "Regen. Der Schirm bleibt trocken.", cloud: "Start steckt in den Wolken.",
    gust: "Zu böig. Groundhandling statt Flug.", spread: "Zu böig. Groundhandling statt Flug.", windLaunch: "Zu viel Wind am Start.",
    dir: "Wind von der falschen Seite.", cape: "Gewittergefahr. Lieber am Boden.", li: "Gewittergefahr. Lieber am Boden.",
    closed: "Bahn oder Startplatz zu.", dark: "Zu wenig Tageslicht.", w850: "Starker Wind in der Höhe.", w700: "Starker Höhenwind." })[top && top[0]] || "Bodentag. Zeit für Groundhandling.";
}
export function buildBriefing(s, ev, day) {
  const nowKey = isSim() ? "" : nowLocalKey();
  const H = day.hours.filter(h => h.t >= nowKey);
  if (!H.length) return null;
  const L = S.limits, hrs = hourRanges;
  const at = (pred) => H.filter(pred).map(h => h.hour);
  const F = FOEHN, fMax = mx(...H.map(h => h.foehn)), fMin = mn(...H.map(h => h.foehn));
  const fPeak = H.find(h => h.foehn === fMax);
  const next = ev.days[ev.days.indexOf(day) + 1];
  const nextF = next ? mx(...next.hours.map(h => h.foehn)) : null;
  // Lage
  let lage = [];
  if (fMax != null && fMax >= L.foehn.r) lage.push(`${F.posName} mit bis zu ${fMax.toLocaleString("de-AT")} hPa (${F.primary.label}) ab etwa ${fPeak.hour} Uhr`);
  else if (fMax != null && fMax >= L.foehn.g) lage.push(`leichter ${F.posName}-Druck (${fMax.toLocaleString("de-AT")} hPa)`);
  else if (fMin != null && fMin <= -L.foehn.r) lage.push(`${F.negName}`);
  const w7 = mx(...H.map(h => h.w700)), w7h = H.find(h => h.w700 === w7);
  if (w7 != null && w7 > L.w700.g) lage.push(`kräftiger Höhenwind${w7h && w7h.d700 != null ? " aus " + compassName(w7h.d700) : ""} (bis ${Math.round(w7)} km/h auf ~3000 m)`);
  const rainH = at(h => h.rain != null && h.rain >= L.rain.r);
  if (rainH.length) lage.push(`Regen ab ${rainH[0]} Uhr`);
  const storm = at(h => stormRisk(h) >= 2);
  if (storm.length) lage.push(`Gewitterneigung ab ${storm[0]} Uhr`);
  if (!lage.length) lage.push("kein Föhnsignal im Druckgradienten, kein Niederschlag");
  if (nextF != null && nextF >= L.foehn.r && !(fMax >= L.foehn.r)) lage.push(`morgen ${F.posName} (bis ${nextF.toLocaleString("de-AT")} hPa)`);
  // Fenster
  const b = day.best;
  let fenster = b ? `${b.level === 0 ? "Grün" : "Gelb"} von ${b.from} bis ${b.to + 1} Uhr.` : "Kein fliegbares Fenster.";
  if (b) {
    const after = H.find(h => h.hour === b.to + 1);
    const why = after && after.score.reasons.find(r => r.level >= 1);
    if (why) fenster += ` Danach: ${why.label} (${why.value}).`;
  }
  // Achtung: wichtigste Einschränkungen mit Uhrzeit
  const achtung = [];
  const gustH = at(h => h.gust != null && h.gust > L.gust.g);
  if (gustH.length) achtung.push(`Böen über ${L.gust.g} km/h ${hrs(gustH)} (bis ${Math.round(mx(...H.map(h => h.gust)))} km/h)`);
  const dirBad = at(h => h.score.grades.dir === 2);
  if (dirBad.length) achtung.push(`Wind von der falschen Seite ${hrs(dirBad)}`);
  const lowCloud = at(h => h.cloud != null && h.cloud < L.cloud.r);
  if (lowCloud.length) achtung.push(`Start in den Wolken ${hrs(lowCloud)}`);
  const lee = H.find(h => h.score.grades.lee >= 1);
  if (lee) achtung.push(lee.score.reasons.find(r => r.key === "lee").label);
  if (H.some(h => h.dirSuspect)) achtung.push("Modell lag heute bei der Windrichtung daneben: vor Ort Windsack prüfen");
  // Thermik
  const blhMax = mx(...H.map(h => h.blh)), blhH = H.find(h => h.blh === blhMax);
  let thermik = null;
  const blhSrc = H.some(h => h.burnair) ? "Thermikobergrenze laut Burnair" : "Grenzschicht (grob, GFS)";
  if (blhMax != null) thermik = blhMax < 500 ? `${blhSrc} niedrig: kaum Durchmischung. Bei Föhn oder Inversion kann es trotzdem turbulent sein.` : `${blhSrc} bis ca. ${Math.round(blhMax / 100) * 100} m über Grund um ${blhH.hour} Uhr${blhMax >= 1500 && S.flight === "hf" && levelIdx() <= 1 ? ", mittags für Anfänger eher ruppig" : ""}.`;
  // Kopfzeile
  const lv = mn(...H.map(h => h.score.level));
  const nGreen = H.filter(h => h.score.level === 0).length, nYellow = H.filter(h => h.score.level === 1).length;
  const kind = nGreen >= 4 ? "Fliegbarer Tag" : nGreen ? "Kurzes Fenster" : nYellow ? "Grenzwertiger Tag" : "Kein Flugtag";
  const head = kind + ": " + lage.slice(0, 3).join(", ") + ".";
  const src = [H.some(h => h.burnair) ? "Burnair" : "Open-Meteo", H.some(h => h.measured) ? "Messung " + STATION_NAME[s.measureStation] : null].filter(Boolean).join(" + ");
  return { lv, head, fenster, achtung, thermik, src };
}
export const levelIdx = () => S.level === "custom" ? (S.levelBase ?? 0) : S.level;
export function stormRisk(h) {
  if (h.cape == null && h.li == null) return null;
  const c = h.cape ?? 0, li = h.li ?? 5;
  if (c > S.limits.cape.r || li < S.limits.li.r - 2) return 3;
  if (c > S.limits.cape.g || li < S.limits.li.r) return 2;
  if (c > 100 || li < S.limits.li.g) return 1;
  return 0;
}
export const STORM_TXT = ["keins", "gering", "mittel", "hoch"];
export const windWord = (v, lim) => v == null ? "–" : v <= lim.g ? "ruhig" : v <= lim.r ? "kräftig" : "stark";
export function aloftExplain(H, st) {
  const out = [], L = S.limits, hrs = hourRanges;
  const strong7 = H.filter(h => h.w700 != null && h.w700 > L.w700.g).map(h => h.hour);
  const strong8 = H.filter(h => h.w850 != null && h.w850 > L.w850.g).map(h => h.hour);
  const max7 = mx(...H.map(h => h.w700)), max8 = mx(...H.map(h => h.w850));
  const s = site(), near8 = Math.abs(s.elev - 1500) < 400, near7 = s.elev >= 1800;
  if (strong8.length) out.push(`Auf ~1500 m weht es ${hrs(strong8)} mit bis zu ${Math.round(max8)} km/h. ${near8 ? "Das ist ungefähr deine Starthöhe: direkt spürbar." : s.elev > 1900 ? "Das liegt unter deinem Start, betrifft vor allem den Landeanflug." : "Das liegt über dem Start, betrifft den Flug."}`);
  else if (max8 != null) out.push(`Auf ~1500 m bleibt es ruhig (max. ${Math.round(max8)} km/h).`);
  if (strong7.length) {
    const d = H.find(h => h.w700 === max7);
    out.push(`Auf ~3000 m kräftiger Wind bis ${Math.round(max7)} km/h${d && d.d700 != null ? " aus " + compassName(d.d700) : ""}. ${near7 ? "Dein Start liegt nahe dieser Höhe: voll relevant, Grate und Leeseiten werden ruppig." : S.flight === "hf" ? "Beim Hike & Fly bist du darunter, aber Leeseiten und Gipfel können ruppig sein." : "Für Thermik- und Streckenflüge oben deutlich windig."}`);
  }
  const risky = H.filter((h, i) => st[i] >= 2).map(h => h.hour);
  const high = H.filter((h, i) => st[i] === 3).map(h => h.hour);
  if (high.length) out.push(`Gewitterrisiko hoch ab ${high[0]} Uhr. Vorher landen, Quellwolken genau beobachten.`);
  else if (risky.length) out.push(`Mittleres Gewitterrisiko ${hrs(risky)}: Quellwolken können schnell wachsen. Lieber früh fliegen.`);
  else out.push("Kein nennenswertes Gewitterrisiko.");
  const low = H.filter(h => h.cloud != null && h.cloud < L.cloud.r).map(h => h.hour);
  if (low.length) out.push(`Wolken sehr tief ${hrs(low)}: Startplatz steckt teils in der Wolke.`);
  return out;
}

export function profileHour(s) {
  const ev = EVAL[s.id], day = curDay();
  if (!ev || !day) return null;
  const key = day.key, d = ev.days.find(x => x.key === key);
  if (!d) return null;
  const hr = SEL.hour ?? (!isSim() && SEL.dayIdx === 0 ? +nowLocalKey().slice(11, 13) : d.best ? d.best.from : 13);
  return d.hours.find(h => h.hour === hr) || d.hours[0];
}
