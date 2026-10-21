// Portiert aus der statischen Version (app.js). Funktionen arbeiten auf einem Kontext,
// der per setCtx() gesetzt wird: Einstellungen S, Daten DATA, Region R, Auswahl SEL, Auswertung EVAL.
/* eslint-disable */
// @ts-nocheck
export const makeParams = (FOEHN) => [
  { key: "windLaunch", label: "Wind am Start",          unit: "km/h", weight: 3, key2: true },
  { key: "gust",       label: "Böen am Start",          unit: "km/h", weight: 3, key2: true },
  { key: "spread",     label: "Böigkeit (Böe − Mittel)", unit: "km/h", weight: 2 },
  { key: "windLand",   label: "Wind am Landeplatz",     unit: "km/h", weight: 2 },
  { key: "w850",       label: "Wind 850 hPa (~1500 m)", unit: "km/h", weight: 2 },
  { key: "w700",       label: "Wind 700 hPa (~3000 m)", unit: "km/h", weight: 1 },
  { key: "foehn",      label: "Föhn " + FOEHN.primary.label, unit: "hPa",  weight: 3, key2: true },
  { key: "cape",       label: "CAPE (Gewitterenergie)", unit: "J/kg", weight: 2 },
  { key: "li",         label: "Lifted Index",           unit: "",     weight: 1, invert: true },
  { key: "cloud",      label: "Wolkenbasis über Start", unit: "m",    weight: 2, invert: true },
  { key: "rain",       label: "Niederschlag",           unit: "mm/h", weight: 3 },
  { key: "blh",        label: "Grenzschicht (grob)", unit: "m", weight: 1 },
];
/* Anfänger/Fortgeschrittene: grün nur, wenn keiner dieser Werte gelb ist */
export const BEGINNER_STRICT = ["cape", "li", "rain", "cloud", "spread", "gust", "windLand", "foehn", "dir", "lee", "w850", "windLaunch", "vis", "front"];
export const PSEUDO = {
  dir:    { label: "Windrichtung am Start", weight: 3, key2: true },
  season: { label: "Saison / Tageszeit",    weight: 1 },
  lee:    { label: "Lee-Lage",              weight: 2 },
  closed: { label: "Startplatz gesperrt",   weight: 3 },
};

/* Level-Presets: [grün bis, rot über] */
export const LEVELS = [
  { name: "Anfänger", desc: "Frischer Schein, wenige Höhenflüge. Nur ruhige, gleichmäßige Bedingungen sind grün.",
    v: { windLaunch: [12, 18], gust: [18, 25], spread: [8, 12], windLand: [12, 20], w850: [15, 25], w700: [20, 30], foehn: [2, 4], cape: [300, 800], li: [2, 0], cloud: [500, 300], rain: [0.05, 0.2], blh: [1500, 2500] } },
  { name: "Fortgeschritten", desc: "Sichere Starts auch bei etwas Wind, erste Thermikflüge.",
    v: { windLaunch: [15, 22], gust: [22, 30], spread: [10, 15], windLand: [15, 24], w850: [20, 30], w700: [30, 40], foehn: [2, 4], cape: [400, 1000], li: [1, -1], cloud: [400, 150], rain: [0.05, 0.3], blh: [2000, 3000] } },
  { name: "Erfahren", desc: "Regelmäßig Thermik und Strecke, kennt die Eigenheiten der Gelände.",
    v: { windLaunch: [18, 25], gust: [25, 32], spread: [12, 18], windLand: [18, 28], w850: [25, 35], w700: [35, 45], foehn: [3, 5], cape: [600, 1200], li: [0, -2], cloud: [300, 100], rain: [0.1, 0.5], blh: [2800, 3800] } },
  { name: "Experte", desc: "Viel Erfahrung, aktives Fliegen in starker Luft. Föhn bleibt auch hier ein Ausschlussgrund.",
    v: { windLaunch: [22, 30], gust: [30, 38], spread: [15, 22], windLand: [22, 32], w850: [30, 40], w700: [45, 55], foehn: [4, 6], cape: [800, 1500], li: [-1, -3], cloud: [200, 50], rain: [0.2, 1], blh: [3500, 4500] } },
];
export const EXTRA_DEFS = [
  { key: "calmWind",    label: "Unter diesem Wind ist die Richtung egal", unit: "km/h", v: 6 },
  { key: "dirTol",      label: "Toleranz am Sektorrand (ohne Holfuy-Sektor)", unit: "°", v: 20 },
  { key: "modelSpread", label: "Modelle uneinig bei Böen: Stufe schlechter ab", unit: "km/h", v: 10 },
  { key: "hourFrom",    label: "Erste Stunde", unit: "Uhr", v: 8 },
  { key: "hourTo",      label: "Letzte Stunde", unit: "Uhr", v: 19 },
  { key: "simDays",     label: "Rückblick: Anzahl Tage", unit: "Tage", v: 30 },
];

/* Ansichten */
/* Flugart: Hike & Fly (Abgleiter in Geländenähe) oder Thermik / Strecke */
export const FLIGHTS = {
  hf: { label: "Hike & Fly / Abgleiter", short: "Hike & Fly" },
  xc: { label: "Thermik / Strecke", short: "Thermik / Strecke" },
};
export const XC = { blhGood: 1500, blhMin: 800, baseGood: 1000, baseMin: 500 };   // m über Grund / über Start
export const MODES = {
  live: { label: "Live 3 Tage", days: 3 },
  week: { label: "7 Tage", days: 7 },
  sim:  { label: "Rückblick", days: null },
};
export const MODULE_IDS = ["live", "profile", "map3d", "history", "foehn", "aloft", "site", "links"];

export function presetLimits(i, PARAMS = makeParams({ primary: { label: "" } })) {
  const out = {};
  PARAMS.forEach(p => { const [g, r] = LEVELS[i].v[p.key]; out[p.key] = { g, r }; });
  return out;
}
export function defaultSettings(SITES) {
  const extra = {}; EXTRA_DEFS.forEach(d => extra[d.key] = d.v);
  const modules = {}; MODULE_IDS.forEach(id => modules[id] = true);
  return { level: 0, levelBase: 0, limits: presetLimits(0), extra, modules, order: MODULE_IDS.slice(), tab: SITES[0].id, mode: "live", flight: "hf" };
}