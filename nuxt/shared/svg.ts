// Portiert aus der statischen Version (app.js). Funktionen arbeiten auf einem Kontext,
// der per setCtx() gesetzt wird: Einstellungen S, Daten DATA, Region R, Auswahl SEL, Auswertung EVAL.
/* eslint-disable */
// @ts-nocheck
import { S, levelIdx, SEL, curDay, isSim } from "./engine";
import { compassName, dayParts, keyOf, nowLocalKey } from "./format";

export const SKY = { 0: ["#2a7fcf", "#8ccff4", "#ffe3a8"], 1: ["#5b82a3", "#b0c5d3", "#eed9b2"], 2: ["#37434f", "#6f7c87", "#a3acb3"], x: ["#44576a", "#8797a4", "#c2cbd2"] };
export const ridgeY = (seed, base, amp, x) => base - amp * (0.55 * Math.sin(x / 53 + seed) + 0.3 * Math.sin(x / 23 + seed * 2.1) + 0.15 * Math.sin(x / 9 + seed * 3.7));
export function ridgePath(seed, base, amp) {
  let d = "M0 220";
  for (let x = 0; x <= 400; x += 5) d += ` L${x} ${ridgeY(seed, base, amp, x).toFixed(1)}`;
  return d + " L400 220 Z";
}
export const cloudPath = (x, y, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="-12" cy="2" rx="14" ry="8"/><ellipse cx="4" cy="-4" rx="16" ry="11"/><ellipse cx="18" cy="3" rx="12" ry="7"/><rect x="-24" y="2" width="52" height="8" rx="4"/></g>`;
export function sceneSVG(level, h, s) {
  const sky = SKY[level ?? "x"];
  const w = h && h.windLaunch != null ? h.windLaunch : 0;
  const sign = h && h.dir != null && Math.sin((h.dir + 180) * Math.PI / 180) < 0 ? -1 : 1;   // Strömung nach Ost = rechts
  const seed = [...s.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 10;
  const sx = 318, sy = ridgeY(seed + 7, 186, 22, sx);
  const droop = 84 - Math.min(w, 22) / 22 * 78;   // schlaff bis waagrecht
  let svg = `<svg class="scene" viewBox="0 0 400 214" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".62" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>
    <radialGradient id="sun"><stop offset="0" stop-color="#fff6d8"/><stop offset=".45" stop-color="#ffd27a"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="214" fill="url(#sky)"/>`;
  if (level === 0 || level === 1) svg += `<circle cx="336" cy="46" r="${level === 0 ? 46 : 34}" fill="url(#sun)" opacity="${level === 0 ? 1 : .6}"/>`;
  if (level === 2 || (h && h.lowCloud > 60)) svg += `<g fill="#e9eef2" opacity="${level === 2 ? .8 : .6}">${cloudPath(70, 40, 1.1)}${cloudPath(220, 28, .9)}${cloudPath(330, 58, 1.2)}</g>`;
  if (h && h.rain >= 0.2) svg += `<g stroke="#dfe7ee" stroke-width="1" opacity=".7">${Array.from({ length: 26 }, (_, i) => { const x = (i * 37) % 400, y = 60 + (i * 23) % 90; return `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + 10}"/>`; }).join("")}</g>`;
  // Windschlieren: Anzahl und Tempo nach Wind
  if (w >= 3) {
    const n = 3 + Math.round(Math.min(w, 30) / 5), dur = Math.max(1.4, 9 - w / 4);
    svg += `<g ${sign < 0 ? 'transform="translate(400 0) scale(-1 1)"' : ""}>` + Array.from({ length: n }, (_, i) => {
      const y = 22 + (i * 29) % 110, len = 18 + Math.min(w, 35) * 1.2, x0 = (i * 137) % 400;
      return `<line class="streak" x1="${x0}" y1="${y}" x2="${x0 + len}" y2="${y}" style="animation-duration:${dur.toFixed(1)}s;animation-delay:${(-i * dur / n).toFixed(2)}s"/>`;
    }).join("") + `</g>`;
  }
  svg += `<path d="${ridgePath(seed + 1, 122, 40)}" fill="#8ea8be" opacity=".85"/>
    <path d="${ridgePath(seed + 4, 152, 34)}" fill="#557189"/>
    <path d="${ridgePath(seed + 7, 186, 22)}" fill="#1f2e3b"/>`;
  // Windsack am Gipfel
  svg += `<g transform="translate(${sx} ${(sy - 30).toFixed(1)})"><line x1="0" y1="0" x2="0" y2="31" stroke="#c9d3db" stroke-width="1.6"/>
    <g transform="scale(${sign} 1) rotate(${droop.toFixed(0)})"><path d="M0 -3.6 L24 -2 L24 2 L0 3.6 Z" fill="#fff"/>
    <path d="M0 -3.6 L6 -3.2 L6 3.2 L0 3.6 Z M12 -2.8 L18 -2.4 L18 2.4 L12 2.8 Z" fill="#e8622c"/></g></g>`;
  // Gleitschirm
  if (level === 0 || level === 1) {
    const gx = level === 0 ? 118 : 160, gy = level === 0 ? 52 : 86;
    svg += `<g class="glider"><g transform="translate(${gx} ${gy}) scale(${sign} 1)">
      <path d="M-26 5 Q0 -13 26 5 Q0 -4 -26 5 Z" fill="#e8622c" stroke="#a83d14" stroke-width=".6"/>
      <path d="M-13 -1.5 L-12 1.6 M0 -4 L0 0.6 M13 -1.5 L12 1.6" stroke="#a83d14" stroke-width=".5"/>
      <g stroke="#1f2e3b" stroke-width=".45"><line x1="-25" y1="5" x2="0" y2="24"/><line x1="-11" y1="1" x2="0" y2="24"/><line x1="11" y1="1" x2="0" y2="24"/><line x1="25" y1="5" x2="0" y2="24"/></g>
      <circle cx="0" cy="26" r="2.8" fill="#1f2e3b"/></g></g>`;
  }
  return svg + `</svg>`;
}
export function arc(c, r, a, b) {
  const p = d => [c + r * Math.sin(d * Math.PI / 180), c - r * Math.cos(d * Math.PI / 180)];
  const span = ((b - a) + 360) % 360 || 360;
  const [x1, y1] = p(a), [x2, y2] = p(b);
  return `M${c} ${c} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
}
export const dirColor = dg => dg === 0 ? "var(--go)" : dg === 1 ? "var(--warn)" : dg === 2 ? "var(--stop)" : "var(--muted)";
export function compassSVG(s, h) {
  const c = 59, r = 52;
  const ls = s.launches || [s], chosen = h && h.score.launch;
  const wedge = l => {
    const full = l.sectorWide && ((l.sectorWide[1] - l.sectorWide[0] + 360) % 360 === 0);
    const dim = chosen && l !== chosen ? .5 : 1;
    const w = !l.sectorWide ? "" : full ? `<circle cx="${c}" cy="${c}" r="${r}" style="fill:var(--warn);opacity:${.18 * dim}"/>` : `<path d="${arc(c, r, l.sectorWide[0], l.sectorWide[1])}" style="fill:var(--warn);opacity:${.22 * dim}"/>`;
    return w + `<path d="${arc(c, r, l.sector[0], l.sector[1])}" style="fill:${l.capYellow && levelIdx() <= 1 ? "var(--warn)" : "var(--go)"};opacity:${.35 * dim}"/>`;
  };
  const wide = ls.map(wedge).join("");
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const len = i % 9 === 0 ? 7 : 3.5, rad = i * 10 * Math.PI / 180;
    return `<line x1="${c + (r - len) * Math.sin(rad)}" y1="${c - (r - len) * Math.cos(rad)}" x2="${c + r * Math.sin(rad)}" y2="${c - r * Math.cos(rad)}" style="stroke:var(--muted);stroke-width:${i % 9 === 0 ? 1.6 : .8}"/>`;
  }).join("");
  const labels = ["N", "O", "S", "W"].map((n, i) => {
    const rad = i * Math.PI / 2;
    return `<text x="${c + (r - 15) * Math.sin(rad)}" y="${c - (r - 15) * Math.cos(rad) + 4}" text-anchor="middle" style="font:700 11px var(--font-data);fill:var(--muted)">${n}</text>`;
  }).join("");
  let arrow = "", center = "";
  if (h && h.dir != null) {
    const col = h.score.dirGrade === -1 ? "var(--ink)" : dirColor(h.score.dirGrade);
    arrow = `<g transform="rotate(${h.dir + 180} ${c} ${c})"><path d="M${c} ${c - 40} L${c + 9} ${c - 22} L${c + 3} ${c - 22} L${c + 3} ${c + 34} L${c - 3} ${c + 34} L${c - 3} ${c - 22} L${c - 9} ${c - 22} Z" style="fill:${col};stroke:var(--surface);stroke-width:1.5"/></g>`;
    center = `<circle cx="${c}" cy="${c}" r="15" style="fill:var(--surface);stroke:var(--line)"/>
      <text x="${c}" y="${c + 4}" text-anchor="middle" style="font:700 12px var(--font-data);fill:var(--ink)">${Math.round(h.windLaunch)}</text>`;
  }
  return `<svg class="compass" viewBox="0 0 118 118" role="img" aria-label="Startsektor ${s.sectorLabel}${h && h.dir != null ? ", Wind aus " + compassName(h.dir) : ""}">
    <circle cx="${c}" cy="${c}" r="${r}" style="fill:var(--surface-2);stroke:var(--line)"/>
    ${wide}
    ${ticks}${labels}${arrow}${center}
  </svg>`;
}

export function arrowSVG(dir, col = "var(--ink)") {
  if (dir == null) return "–";
  return `<svg class="arrow" viewBox="0 0 24 24" aria-label="aus ${compassName(dir)}"><g transform="rotate(${dir + 180} 12 12)"><path d="M12 2 L17.5 11 L13.6 11 L13.6 22 L10.4 22 L10.4 11 L6.5 11 Z" style="fill:${col}"/></g></svg>`;
}
export function gaugeSVG(v, lim) {
  const c = 75, cy = 80, r = 62, max = Math.max(8, lim.r + 3);
  const ang = x => Math.PI * (1 - Math.min(Math.max(x, 0), max) / max);
  const pt = (x, rr) => [c + rr * Math.cos(ang(x)), cy - rr * Math.sin(ang(x))];
  const band = (a, b, style) => {
    const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r), [x3, y3] = pt(b, r - 14), [x4, y4] = pt(a, r - 14);
    return `<path d="M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r - 14} ${r - 14} 0 0 0 ${x4} ${y4} Z" style="${style}"/>`;
  };
  let needle = "";
  if (v != null) {
    const [nx, ny] = pt(v, r - 4);
    needle = `<line x1="${c}" y1="${cy}" x2="${nx}" y2="${ny}" style="stroke:var(--ink);stroke-width:3;stroke-linecap:round"/><circle cx="${c}" cy="${cy}" r="5" style="fill:var(--ink)"/>`;
  }
  const tick = x => { const [tx, ty] = pt(x, r + 8); return `<text x="${tx}" y="${ty + 3}" text-anchor="middle" style="font:9px var(--font-data);fill:var(--muted)">${x}</text>`; };
  return `<svg class="gauge" viewBox="0 0 150 92" role="img" aria-label="Föhn ${v ?? "–"} hPa">
    <defs><pattern id="hatch-g" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" style="stroke:var(--stop);stroke-width:2"/></pattern></defs>
    ${band(0, lim.g, "fill:var(--go);opacity:.75")}${band(lim.g, lim.r, "fill:var(--warn);opacity:.8")}${band(lim.r, max, "fill:url(#hatch-g)")}
    ${tick(0)}${tick(lim.g)}${tick(lim.r)}${tick(max)}${needle}
  </svg>`;
}
export function lineChart({ time, series, thresholds = [], bars = null, height = 130, hatchAbove = null }) {
  const W = 340, H = height, pl = 30, pr = 6, pt = 8, pb = 18, n = time.length;
  const x = i => pl + (W - pl - pr) * (i / Math.max(1, n - 1));
  const vals = series.flatMap(s => s.vals).concat(bars ? bars.vals : []).filter(v => v != null);
  const top = Math.max(1, ...vals, ...thresholds.map(t => t.v)) * 1.12, yMin = Math.min(0, ...vals);
  const y = v => pt + (H - pt - pb) * (1 - (v - yMin) / (top - yMin));
  const uid = "h" + Math.random().toString(36).slice(2, 8);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
  if (hatchAbove != null && hatchAbove < top) {
    svg += `<defs><pattern id="${uid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--stop);stroke-width:1.6;opacity:.4"/></pattern></defs>
      <rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${Math.max(0, y(hatchAbove) - pt)}" style="fill:url(#${uid})"/>`;
  }
  niceTicks(yMin, top, 4).forEach(t => svg += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl - 4}" y="${y(t) + 3}" text-anchor="end">${t}</text>`);
  time.forEach((t, i) => {
    if (t.endsWith("T00:00") && i > 0) svg += `<line class="daysep" x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${H - pb}"/>`;
    if (t.endsWith("T12:00")) svg += `<text x="${x(i)}" y="${H - 5}" text-anchor="middle">${dayParts(t.slice(0, 10)).wd}</text>`;
  });
  thresholds.forEach(th => svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(th.v)}" y2="${y(th.v)}" style="stroke:${th.color};stroke-width:1;stroke-dasharray:4 3"/>`);
  if (bars) {
    const bw = Math.max(1, (W - pl - pr) / n - 0.6);
    bars.vals.forEach((v, i) => { if (v > 0) svg += `<rect x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${Math.max(0, y(yMin) - y(v))}" style="fill:${bars.color};opacity:.6"/>`; });
  }
  series.forEach(s => {
    let d = "", pen = false;
    s.vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); pen = true; });
    svg += `<path d="${d}" style="fill:none;stroke:${s.color};stroke-width:${s.width || 1.8};stroke-linejoin:round;${s.dash ? "stroke-dasharray:" + s.dash : ""}"/>`;
  });
  const ni = isSim() ? -1 : time.indexOf(nowLocalKey());
  if (ni >= 0) svg += `<line class="nowline" x1="${x(ni)}" x2="${x(ni)}" y1="${pt}" y2="${H - pb}"/>`;
  const day = curDay();
  if (SEL.hour != null && day) {
    const si = time.indexOf(keyOf(day.key, SEL.hour));
    if (si >= 0) svg += `<line x1="${x(si)}" x2="${x(si)}" y1="${pt}" y2="${H - pb}" style="stroke:var(--accent);stroke-width:1.5"/>`;
  }
  return svg + `</svg>`;
}
export function niceTicks(a, b, count) {
  const raw = (b - a) / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(a / step) * step; v <= b; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

