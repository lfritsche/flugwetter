// Darstellungs-Module als Render-Funktionen (HTML/SVG-Strings), portiert aus app.js.
// Werden von den Modul-Komponenten per v-html eingebunden. Vorher muss der Engine-Kontext gesetzt sein (D.sync()).
// @ts-nocheck
import { S, DATA, R, FOEHN, STATIONS, STATION_NAME, SEL, EVAL, curDay, isSim, activeData, grade, inSector, dirGrade, mx, mn, levelIdx, stormRisk, aloftExplain, profileHour, dayName } from "#shared/engine";
import { arrowSVG, gaugeSVG, lineChart } from "#shared/svg";
import { compassName, fmt, lvClass, nowLocalKey, keyOf, prevDay, dayParts, dateStr } from "#shared/format";

export function renderStations() {
  const L = DATA.live;
  if (DATA.errors.live) return `<div class="err">Messstationen nicht geladen: ${DATA.errors.live}</div>`;
  if (!L) return `<div class="muted">Lade Messstationen…</div>`;
  const lim = S.limits;
  const rows = STATIONS.map(st => {
    const v = L.st[st.id] || {};
    const lv = v.ffx == null ? null : Math.max(grade(v.ff, lim.windLaunch), grade(v.ffx, lim.gust));
    return `<div class="station"><div class="nm"><b>${st.name}</b> <span class="muted mono" style="font-size:11.5px">${st.elev} m</span><small>${st.role}</small></div>
      ${v.dir == null ? `<span class="muted">–</span>` : arrowSVG(v.dir)}
      <div class="v">${v.ff == null ? "–" : Math.round(v.ff)}<small>Mittel</small></div>
      <div class="v"><span class="st ${lvClass(lv)}" style="width:8px;height:8px;margin-right:4px"></span>${v.ffx == null ? "–" : Math.round(v.ffx)}<small>Böe km/h</small></div></div>`;
  }).join("");
  const ws = FOEHN.warnStation, br = L.st[ws.id];
  let flag = "";
  if (br && br.ffx != null) {
    const inDir = br.dir != null && inSector(br.dir, ws.sector);
    if (br.ffx >= 35 || (inDir && br.ffx >= 25)) flag = `<div class="flag stop"><b>Föhnverdacht:</b> ${ws.name} meldet ${Math.round(br.ffx)} km/h Böen aus ${compassName(br.dir || 0)}. ${ws.note}</div>`;
    else if (inDir && br.ffx >= 15) flag = `<div class="flag warn"><b>Beobachten:</b> ${ws.dirLabel} in ${ws.name} mit ${Math.round(br.ffx)} km/h Böen.</div>`;
  }
  const t = L.ts ? new Date(L.ts).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }) : "";
  return `<div class="label">Messstationen ${R.stationLabel} · ${t} Uhr</div><div class="stations">${rows}</div>${flag}`;
}

export function renderHistory(s) {
  const ev = EVAL[s.id];
  const head = `<h2>Windverlauf <small>Wann hat die Richtung gepasst?</small></h2>`;
  if (!ev || !ev.days.length) return head + `<div class="muted">Lade…</div>`;
  // Live: gestern + heute. Rückblick: Vortag + gewählter Tag.
  const dayB = isSim() ? curDay().key : nowLocalKey().slice(0, 10);
  const dayA = prevDay(dayB);
  const nameA = isSim() ? dayParts(dayA).wd + " " + dayParts(dayA).dm : "Gestern";
  const nameB = isSim() ? dayParts(dayB).wd + " " + dayParts(dayB).dm : "Heute";
  const H = Array.from({ length: 16 }, (_, i) => i + 6);
  const nowKey = nowLocalKey();
  const A = activeData();
  const hist = A.hist && A.hist[s.historyStation];
  const hourAt = (day, hr) => ev.hours.find(x => x.t === keyOf(day, hr));
  const modelRow = day => H.map(hr => {
    const h = hourAt(day, hr);
    if (!h || h.dir == null) return `<div class="k"></div>`;
    const dg = dirGrade(s, h.dir, h.windLaunch);
    return `<div class="k ${dg === -1 ? "calm" : "d" + dg}" title="${hr} Uhr: ${compassName(h.dir)} ${Math.round(h.windLaunch)} km/h${!isSim() && keyOf(day, hr) > nowKey ? " (Prognose)" : ""}">${arrowSVG(h.dir, dg === -1 ? "var(--muted)" : "var(--ink)")}</div>`;
  }).join("");
  const stationRow = day => H.map(hr => {
    const v = hist && hist[keyOf(day, hr)];
    if (!v) return `<div class="k"></div>`;
    return `<div class="k v${grade(v.ffx, S.limits.gust) ?? 0}" title="${hr} Uhr: ${compassName(v.dir)} ${Math.round(v.ff)} km/h, Böe ${Math.round(v.ffx)}">${arrowSVG(v.dir)}</div>`;
  }).join("");
  const windowText = day => {
    let best = null, cur = null;
    H.forEach(hr => {
      const h = hourAt(day, hr);
      const ok = h && h.dir != null && [0, -1].includes(dirGrade(s, h.dir, h.windLaunch));
      cur = ok ? (cur ? { ...cur, to: hr } : { from: hr, to: hr }) : null;
      if (cur && (!best || cur.to - cur.from > best.to - best.from)) best = { ...cur };
    });
    return best ? `<b class="mono">${best.from}–${best.to + 1} Uhr</b>` : "<b>gar nicht</b>";
  };
  const stName = STATION_NAME[s.historyStation];
  return head + `
    <div style="font-size:13.5px">${nameA} passte die Richtung am Start ${windowText(dayA)}, ${nameB.toLowerCase() === "heute" ? "heute" : nameB} ${windowText(dayB)}.</div>
    <div class="table-scroll"><div class="carpet">
      <div class="rh"></div>${H.map(h => `<div class="hh">${h % 3 === 0 ? h : ""}</div>`).join("")}
      <div class="rh">Start ${nameA}</div>${modelRow(dayA)}
      <div class="rh">Start ${nameB}</div>${modelRow(dayB)}
      <div class="gap"></div>
      <div class="rh">${stName} ${nameA}</div>${stationRow(dayA)}
      <div class="rh">${stName} ${nameB}</div>${stationRow(dayB)}
    </div></div>
    <div class="legend"><span><i style="background:var(--go);opacity:.5"></i>optimal</span><span><i style="background:var(--warn);opacity:.6"></i>fliegbar</span><span><i style="background:var(--stop);opacity:.5"></i>falsche Richtung</span><span><i style="background:var(--calm);opacity:.5"></i>windstill</span><span>Tal: dunkler = böiger</span></div>
    <div class="hint">Start: Modellwerte am Startplatz${isSim() ? "" : ", nach jetzt als Prognose"}. ${stName}: gemessen (${R.stationLabel}), zeigt den Talwind.${s.holfuy && s.holfuy.length ? " Gemessener Verlauf am Start: Holfuy-Tabelle unter „Live am Start“." : ""}</div>
    ${DATA.errors.hist ? `<div class="err">Stationsverlauf nicht geladen: ${DATA.errors.hist}</div>` : ""}`;
}

export function windowSeries(F) {
  // Live: ganze Prognose. Rückblick: gewählter Tag ±1.
  if (!isSim()) return F;
  const d = curDay(); if (!d) return F;
  const from = prevDay(d.key), to = (() => { const x = new Date(d.key + "T12:00:00"); x.setDate(x.getDate() + 1); return dateStr(x); })();
  const idx = F.time.map((t, i) => [t, i]).filter(([t]) => t.slice(0, 10) >= from && t.slice(0, 10) <= to).map(([, i]) => i);
  return { time: idx.map(i => F.time[i]), bi: idx.map(i => F.bi[i]), lz: idx.map(i => F.lz[i]), byTime: F.byTime };
}

export function renderFoehn() {
  const A = activeData(), head = `<h2>Föhn-Barometer <small>${FOEHN.primary.label}</small></h2>`;
  const err = isSim() ? DATA.errors.sim : DATA.errors.foehn;
  if (err) return head + `<div class="err">Föhndaten nicht geladen: ${err}</div>`;
  if (!A.foehn) return head + `<div class="muted">Lade…</div>`;
  const F = windowSeries(A.foehn), day = curDay();
  const key = SEL.hour != null && day ? keyOf(day.key, SEL.hour) : (isSim() && day ? keyOf(day.key, 13) : nowLocalKey());
  const cur = A.foehn.byTime[key] || {}, lim = S.limits.foehn;
  const maxBI = mx(...F.bi), peak = F.bi.indexOf(maxBI);
  return head + `
    <div class="foehn-top">
      ${gaugeSVG(cur.bi, lim)}
      <div style="display:grid;gap:6px">
        <div class="metric"><div class="label">${SEL.hour != null || isSim() ? key.slice(11, 13) + " Uhr" : "Jetzt"}</div><div class="val"><span class="st ${lvClass(grade(cur.bi, lim))}" style="margin-right:6px"></span>${fmt(cur.bi, "")}<small> hPa</small></div></div>
        <div class="hint">${FOEHN.secondary.label} zum Vergleich: <b class="mono">${fmt(cur.lz, "hPa")}</b></div>
      </div>
    </div>
    ${lineChart({ time: F.time, series: [{ vals: F.bi, color: "var(--accent)", width: 2.2 }, { vals: F.lz, color: "var(--muted)", dash: "4 3", width: 1.2 }],
      thresholds: [{ v: lim.g, color: "var(--warn)" }, { v: lim.r, color: "var(--stop)" }], hatchAbove: lim.r })}
    <div class="chart-legend"><span><i style="background:var(--accent)"></i>${FOEHN.primary.label}</span><span><i style="background:var(--muted)"></i>${FOEHN.secondary.label}</span><span><i style="background:repeating-linear-gradient(90deg,var(--stop) 0 2px,transparent 2px 4px)"></i>schraffiert: über ${lim.r} hPa</span></div>
    <div class="hint">Maximum im Zeitraum: <b class="mono">${fmt(maxBI, "hPa")}</b> (${peak >= 0 ? new Date(F.time[peak]).toLocaleString("de-AT", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "–"}). Föhn kann auch unter diesen Werten durchbrechen: Böen in ${FOEHN.warnStation.name} beobachten.</div>`;
}

export function renderAloft(s) {
  const ev = EVAL[s.id], head = `<h2>Höhenwind & Gewitter <small>${s.name}</small></h2>`;
  if (!ev || !ev.days.length) return head + `<div class="muted">Lade…</div>`;
  const day = curDay(), H = day.hours, L = S.limits, expert = levelIdx() >= 2;
  const st = H.map(stormRisk), stCls = r => r == null ? "" : r === 0 ? "t0" : r === 1 ? "t0" : r === 2 ? "t1" : "t2";
  const cell = (cls, txt) => `<div class="c ${cls}">${txt}</div>`;
  let grid = `<div class="rh"></div>` + H.map(h => `<div class="hh">${h.hour}</div>`).join("");
  grid += `<div class="rh">Wind ~1500 m</div>` + H.map(h => cell(h.w850 == null ? "" : "t" + grade(h.w850, L.w850), h.w850 == null ? "–" : Math.round(h.w850))).join("");
  grid += `<div class="rh">Wind ~3000 m</div>` + H.map(h => cell(h.w700 == null ? "" : "t" + grade(h.w700, L.w700), h.w700 == null ? "–" : Math.round(h.w700))).join("");
  grid += `<div class="rh">Gewitter</div>` + H.map((h, i) => cell(stCls(st[i]), st[i] == null ? "–" : ["·", "g", "m", "h"][st[i]])).join("");
  grid += `<div class="rh">Basis über Start</div>` + H.map(h => cell(h.cloud == null ? "t0" : "t" + grade(h.cloud, L.cloud, true), h.cloud == null ? "frei" : h.cloud > 4000 ? "hoch" : (h.cloud / 1000).toLocaleString("de-AT", { maximumFractionDigits: 1, minimumFractionDigits: 1 }))).join("");
  const table = `<div class="table-scroll"><div class="htable" style="--cols:${H.length}">${grid}</div></div>
    <div class="legend"><span>Wind in km/h</span><span>Gewitter: · keins, g gering, m mittel, h hoch</span><span>Basis in km, frei = keine tiefen Wolken</span></div>`;
  const expl = aloftExplain(H, st);
  const explHtml = `<div class="explain-box"><div class="label">Was heißt das?</div><ul class="notes">${expl.map(t => `<li>${t}</li>`).join("")}</ul></div>`;
  const help = `<details class="explain"><summary>Begriffe erklärt</summary><div class="explain-body">
      <div><b>Höhenwind:</b> Wind über dem Startplatz. Ist er deutlich stärker als am Start, wird es oben ruppig und auf der Leeseite (windabgewandt) turbulent.</div>
      <div><b>Gewitter:</b> aus CAPE (Energie für aufsteigende Luft) und Lifted Index (Labilität). „Mittel“ heißt: Quellwolken können am Nachmittag in die Höhe schießen. Früh fliegen, Himmel beobachten.</div>
      <div><b>Basis über Start:</b> wie hoch die Wolkenuntergrenze über dem Startplatz liegt. Unter 200 m steckt der Start praktisch in der Wolke.</div>
    </div></details>`;
  if (!expert) {
    return head + explHtml + table + help + `<details class="explain"><summary>Diagramme anzeigen</summary><div class="explain-body">${aloftCharts(s)}</div></details>`;
  }
  return head + explHtml + aloftCharts(s) + `<details class="explain"><summary>Tabelle für ${dayName(SEL.dayIdx, day.key)}</summary><div class="explain-body">${table}</div></details>` + help;
}

export function aloftCharts(s) {
  const ev = EVAL[s.id], head = "";
  if (!ev || !ev.days.length) return head + `<div class="muted">Lade…</div>`;
  let H;
  if (isSim()) { const d = curDay().key, a = prevDay(d); H = ev.hours.filter(h => h.day >= a && h.day <= d); }
  else { const today = nowLocalKey().slice(0, 10), last = ev.days[ev.days.length - 1].key; H = ev.hours.filter(h => h.day >= today && h.day <= last); }
  const time = H.map(h => h.t), L = S.limits;
  return head + `
    <div class="label">Wind in km/h</div>
    ${lineChart({ time, series: [
      { vals: H.map(h => h.windLaunch), color: "var(--go)" },
      { vals: H.map(h => h.gust), color: "var(--go)", dash: "3 3", width: 1.3 },
      { vals: H.map(h => h.w850), color: "var(--accent)" },
      { vals: H.map(h => h.w700), color: "var(--ink)", width: 1.3 },
    ], thresholds: [{ v: L.gust.r, color: "var(--stop)" }], hatchAbove: L.gust.r })}
    <div class="chart-legend"><span><i style="background:var(--go)"></i>Start Mittel / Böe</span><span><i style="background:var(--accent)"></i>850 hPa</span><span><i style="background:var(--ink)"></i>700 hPa</span><span><i style="background:var(--stop)"></i>Böen-Limit ${L.gust.r}</span></div>
    <div class="label">CAPE in J/kg (Balken) · Wolkenbasis über Start in m (Linie)</div>
    ${lineChart({ time, series: [], bars: { vals: H.map(h => h.cape), color: "var(--warn)" }, thresholds: [{ v: L.cape.r, color: "var(--stop)" }], hatchAbove: L.cape.r, height: 90 })}
    ${lineChart({ time, series: [{ vals: H.map(h => h.cloud == null ? null : Math.min(h.cloud, 2000)), color: "var(--accent)" }], thresholds: [{ v: L.cloud.g, color: "var(--warn)" }, { v: L.cloud.r, color: "var(--stop)" }], height: 90 })}
    <div class="hint">Wolkenbasis gekappt bei 2000 m, Lücke = wolkenlos. ${isSim() ? "Zeitraum: Vortag und gewählter Tag." : "Höhenwind ICON-D2, danach ICON-EU / ECMWF / GFS."}</div>`;
}

export function renderSiteInfo(s) {
  const L = s.landing;
  const sec = s.launches ? s.launches.map(l => `${l.name}: ${l.sector[0]}–${l.sector[1] % 360}°${l.capYellow ? " (für Anfänger gelb)" : ""}`).join(" · ")
    : s.sectorWide ? `optimal ${s.sector[0]}–${s.sector[1] % 360}°, fliegbar ${s.sectorWide[0]}–${s.sectorWide[1]}°${s.sectorSource ? " (" + s.sectorSource + ")" : ""}` : `${s.sector[0]}–${s.sector[1]}°`;
  return `<h2>Startplatz-Info <small>${s.area}</small></h2>
    <ul class="notes">${s.notes.map(n => `<li>${n}</li>`).join("")}</ul>
    <div class="hint">Start ${s.elev} m${s.approx ? " (ungefähr)" : ""} · Richtung ${sec} · ${L.name} ${L.elev} m${L.approx ? " (Lage ungefähr)" : ""}</div>
    <div class="hint"><a href="https://map.burnair.cloud/" target="_blank" rel="noopener">Burnair-Prognose (Startplatz „${s.name}“ suchen)</a> · <a href="https://www.google.com/maps?q=${s.lat},${s.lon}" target="_blank" rel="noopener">Start auf Karte</a> · <a href="https://www.google.com/maps?q=${L.lat},${L.lon}" target="_blank" rel="noopener">Landeplatz auf Karte</a></div>`;
}

export function renderLinks(s) {
  const own = (s.holfuy || []).map(h => ({ t: "Holfuy " + h.label, d: "Wind live + Verlauf", u: `https://holfuy.com/de/weather/${h.id}` }));
  return `<h2>Links</h2><div class="links">${own.concat(R.LINKS).map(l => `<a href="${l.u}" target="_blank" rel="noopener"><b>${l.t}</b><small>${l.d}</small></a>`).join("")}</div>`;
}

export function renderProfile(s) {
  const ev = EVAL[s.id], head = `<h2>Windprofil <small>Wind in der Höhe über den Tag</small></h2>`;
  if (!ev || !ev.days.length) return head + `<div class="muted">Lade…</div>`;
  const day = curDay(), H = day.hours, L = S.limits;
  const W = 340, Hh = 250, pl = 52, pr = 6, pt = 10, pb = 18;
  const aMin = Math.max(0, s.landing.elev - 150), aMax = 3400;
  const n = H.length, cw = (W - pl - pr) / n;
  const x = i => pl + cw * (i + 0.5);
  const y = a => pt + (Hh - pt - pb) * (1 - (a - aMin) / (aMax - aMin));
  const levels = [
    { a: s.landing.elev, w: "windLand", d: "dirLand", lim: L.windLand, name: "Landung" },
    { a: s.elev, w: "windLaunch", d: "dir", lim: L.windLaunch, name: "Start" },
    { a: 1500, w: "w850", d: "d850", lim: L.w850, name: "850 hPa" },
    { a: 3000, w: "w700", d: "d700", lim: L.w700, name: "700 hPa" },
  ].sort((p, q) => p.a - q.a);
  // Zeilen mit mind. 24 px Abstand; Druckflächen (Höhe nur ungefähr) weichen nach oben aus
  levels.forEach((l, i) => {
    l.y = y(l.a);
    if (i > 0 && levels[i - 1].y - l.y < 24) l.y = levels[i - 1].y - 24;
  });
  const col = g => g === 0 ? "var(--go)" : g === 1 ? "var(--warn)" : g === 2 ? "var(--stop)" : "var(--muted)";
  let svg = `<svg class="chart profile" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Windprofil">`;
  // Boden bis Landeplatz, Linie Starthöhe
  svg += `<rect x="${pl}" y="${y(s.landing.elev)}" width="${W - pl - pr}" height="${Hh - pb - y(s.landing.elev)}" style="fill:var(--surface-2)"/>`;
  svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(s.elev)}" y2="${y(s.elev)}" style="stroke:var(--accent);stroke-width:1;stroke-dasharray:3 3;opacity:.7"/>`;
  [1000, 2000, 3000].forEach(a => { if (a > aMin) svg += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(a)}" y2="${y(a)}"/>`; });
  levels.forEach(l => svg += `<text x="${pl - 4}" y="${l.y - 1}" text-anchor="end">${l.name}</text><text x="${pl - 4}" y="${l.y + 9}" text-anchor="end" style="font-size:8.5px">${l.name.includes("hPa") ? "≈" : ""}${Math.round(l.a)} m</text>`);
  // Auswahl-Spalte
  const selIdx = SEL.hour != null ? H.findIndex(h => h.hour === SEL.hour) : -1;
  if (selIdx >= 0) svg += `<rect x="${pl + cw * selIdx}" y="${pt}" width="${cw}" height="${Hh - pt - pb}" style="fill:var(--accent);opacity:.1"/>`;
  // Grenzschicht (grob, GFS) als Linie, Wolkenbasis als Wolken
  let blh = "", pen = false;
  H.forEach((h, i) => {
    if (h.blh == null) { pen = false; return; }
    const a = Math.min(aMax, s.landing.elev + h.blh);
    blh += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(a).toFixed(1); pen = true;
  });
  if (blh) svg += `<path d="${blh}" style="fill:none;stroke:var(--warn);stroke-width:1.6;stroke-dasharray:5 3"/>`;
  H.forEach((h, i) => {
    if (h.cloudBase == null || h.cloudBase > aMax) return;
    const cy = y(h.cloudBase);
    svg += `<g style="fill:var(--muted);opacity:.55"><ellipse cx="${x(i) - 4}" cy="${cy}" rx="7" ry="4.5"/><ellipse cx="${x(i) + 4}" cy="${cy - 2}" rx="7" ry="5.5"/><rect x="${x(i) - 11}" y="${cy}" width="22" height="3"/></g>`;
  });
  // Pfeile pro Höhe und Stunde
  levels.forEach(l => H.forEach((h, i) => {
    const w = h[l.w], d = h[l.d];
    if (w == null || d == null) return;
    const g = grade(w, l.lim), sc = 0.55 + Math.min(w, 45) / 45 * 0.6;
    svg += `<g transform="translate(${x(i)} ${l.y}) rotate(${d + 180}) scale(${sc.toFixed(2)})"><path d="M0 -10 L6 -1 L2.2 -1 L2.2 10 L-2.2 10 L-2.2 -1 L-6 -1 Z" style="fill:${col(g)};stroke:var(--surface);stroke-width:.8"/></g>`;
  }));
  // Stundenachse + Ampel-Leiste
  H.forEach((h, i) => {
    svg += `<rect x="${pl + cw * i + 1}" y="${Hh - pb + 3}" width="${cw - 2}" height="4" rx="2" style="fill:${h.score.level == null ? "var(--nodata)" : col(h.score.level)}"/>`;
    if (h.hour % 2 === 0) svg += `<text x="${x(i)}" y="${Hh - 2}" text-anchor="middle">${h.hour}</text>`;
  });
  svg += `</svg>`;
  return head + svg + `
    <div class="chart-legend"><span><i style="background:var(--go)"></i>Pfeil grün/gelb/rot = Wind nach deinen Grenzen, Größe = Stärke</span><span><i style="background:var(--warn)"></i>Grenzschicht (grob, GFS)</span><span><i style="background:var(--muted)"></i>Wolkenbasis</span><span><i style="background:var(--accent)"></i>Starthöhe</span></div>
    <div class="hint">Zeigt Scherung und starken Höhenwind auf einen Blick: Wird der Pfeil nach oben hin rot oder dreht stark, ist Vorsicht angesagt.</div>`;
}

