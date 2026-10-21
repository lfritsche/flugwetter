// Zentraler Zustand eines Regions-Dashboards: Einstellungen (nur dieses Gerät), Daten aus der eigenen API,
// Auswertung über die gemeinsame Engine (#shared/engine). Wird per provide/inject an Komponenten gereicht.
// @ts-nocheck
import { REGIONS } from "#shared/regions";
import { LEVELS, MODES, FLIGHTS, MODULE_IDS, EXTRA_DEFS, presetLimits, makeParams } from "#shared/config";
import { setCtx, evaluateSite, activeData } from "#shared/engine";

const BA_KEY = "flugwetter.burnair";
const safe = (f, fb = null) => { try { return f(); } catch { return fb; } };

export function useDashboard(regionId: string) {
  const R = REGIONS[regionId];
  const PARAMS = makeParams(R.foehn);

  // ---------- Einstellungen
  function defaults() {
    const extra = {}; EXTRA_DEFS.forEach(d => extra[d.key] = d.v);
    const modules = {}; MODULE_IDS.forEach(id => modules[id] = true);
    return { level: 0, levelBase: 0, limits: presetLimits(0, PARAMS), extra, modules, order: MODULE_IDS.slice(), tab: R.SITES[0].id, mode: "live", flight: "hf" };
  }
  function load() {
    const def = defaults();
    const s = safe(() => JSON.parse(localStorage.getItem(R.storeKey) || "null"));
    if (!s) return def;
    const order = Array.isArray(s.order) ? s.order.filter(id => MODULE_IDS.includes(id)) : [];
    return {
      level: s.level === "custom" || (Number.isInteger(s.level) && LEVELS[s.level]) ? s.level : 0,
      levelBase: Number.isInteger(s.levelBase) && LEVELS[s.levelBase] ? s.levelBase : 0,
      limits: Object.assign(def.limits, s.limits || {}),
      extra: Object.assign(def.extra, s.extra || {}),
      modules: Object.assign(def.modules, s.modules || {}),
      order: MODULE_IDS.reduce((o, id, i) => { if (!o.includes(id)) o.splice(Math.min(i, o.length), 0, id); return o; }, order.slice()),
      tab: R.SITES.some(x => x.id === s.tab) ? s.tab : def.tab,
      mode: MODES[s.mode] && s.mode !== "sim" ? s.mode : "live",   // Rückblick startet nie automatisch
      flight: FLIGHTS[s.flight] ? s.flight : "hf",
    };
  }
  const S = reactive(load());
  watch(S, v => safe(() => localStorage.setItem(R.storeKey, JSON.stringify(v))), { deep: true });

  // ---------- Daten & Auswahl
  const SEL = reactive({ dayIdx: 0, hour: null, touched: false });
  const DATA = reactive({ fc: null, foehn: null, live: null, hist: null, simFc: null, simFoehn: null, simHist: null, burnair: null, fetchedAt: null, errors: {} });
  const loading = ref(false), simLoading = ref(false);

  const EVAL = computed(() => {
    setCtx({ S, DATA, R, SEL, EVAL: {} });
    if (!activeData().fc) return {};
    const out = {};
    for (const s of R.SITES) { try { out[s.id] = evaluateSite(s); } catch (e) { console.error(s.id, e); } }
    return out;
  });
  /** Engine-Kontext für Render-Helfer setzen (vor jedem Aufruf in computed) */
  const sync = () => { setCtx({ S, DATA, R, SEL, EVAL: EVAL.value }); return EVAL.value; };

  // ---------- Burnair (Login über eigenes Backend)
  const burnairEnabled = !!useRuntimeConfig().public.burnairEnabled;
  const BA = ref(burnairEnabled ? safe(() => { const a = JSON.parse(localStorage.getItem(BA_KEY) || "null"); return a && a.exp > Date.now() ? a : null; }) : null);
  if (!burnairEnabled) safe(() => localStorage.removeItem(BA_KEY));
  watch(BA, a => safe(() => a ? localStorage.setItem(BA_KEY, JSON.stringify(a)) : localStorage.removeItem(BA_KEY)));
  async function burnairLogin(username, password) {
    const d = await $fetch("/api/burnair/login", { method: "POST", body: { username, password } }).catch(e => { throw new Error(e?.data?.statusMessage || "Login fehlgeschlagen"); });
    BA.value = { token: d.token, exp: Date.now() + Math.max(60, (d.expiresIn || 3600) - 60) * 1000, name: d.name || username };
    await fetchAll();
  }
  function burnairLogout() { BA.value = null; DATA.burnair = null; }
  async function fetchBurnair(days) {
    if (!BA.value) return null;
    try {
      return await $fetch(`/api/burnair/forecast?region=${regionId}&days=${Math.min(days, 3)}`, { headers: { Authorization: BA.value.token } });
    } catch (e) {
      if (e?.statusCode === 401) burnairLogout();
      throw new Error(e?.data?.statusMessage || "Burnair nicht erreichbar");
    }
  }

  // ---------- Laden
  async function fetchAll() {
    loading.value = true;
    ["fc", "foehn", "live", "hist", "burnair"].forEach(k => delete DATA.errors[k]);
    const days = S.mode === "week" ? 7 : 3;
    const [reg, live, ba] = await Promise.allSettled([
      $fetch(`/api/region/${regionId}?days=${days}`), $fetch(`/api/live/${regionId}`), fetchBurnair(days),
    ]);
    if (reg.status === "fulfilled") {
      Object.assign(DATA, { fc: reg.value.fc ?? null, foehn: reg.value.foehn ?? null, hist: reg.value.hist ?? null });
      Object.entries(reg.value.errors || {}).forEach(([k, v]) => DATA.errors[k] = v);
      DATA.fcWeek = days === 7;
    } else DATA.errors.fc = reg.reason?.message || "Prognose nicht erreichbar";
    if (live.status === "fulfilled") DATA.live = live.value; else DATA.errors.live = live.reason?.message;
    if (ba.status === "fulfilled") DATA.burnair = ba.value; else DATA.errors.burnair = ba.reason?.message;
    DATA.fetchedAt = new Date();
    loading.value = false;
  }
  async function fetchSim() {
    simLoading.value = true; delete DATA.errors.sim; SEL.touched = false;
    try {
      const d = await $fetch(`/api/sim/${regionId}?days=${S.extra.simDays}`);
      Object.assign(DATA, { simFc: d.fc, simFoehn: d.foehn ?? null, simHist: d.hist ?? null });
      if (d.errors?.foehn) DATA.errors.sim = "Föhn: " + d.errors.foehn;
    } catch (e) { DATA.errors.sim = e?.data?.statusMessage || e.message; }
    simLoading.value = false;
  }
  async function setMode(mode) {
    if (S.mode === mode) return;
    S.mode = mode; SEL.dayIdx = 0; SEL.hour = null;
    if (mode === "week" && !DATA.fcWeek) await fetchAll();
    if (mode === "sim" && !DATA.simFc) await fetchSim();
  }
  function refresh() { return S.mode === "sim" ? (DATA.simFc = null, fetchSim()) : fetchAll(); }
  function setLevel(i) { S.level = i; S.levelBase = i; S.limits = presetLimits(i, PARAMS); }

  // Rückblick: mit dem besten Tag starten; Tagesindex begrenzen
  watch(EVAL, ev => {
    const e = ev[S.tab]; if (!e) return;
    if (SEL.dayIdx >= e.days.length) SEL.dayIdx = 0;
    if (S.mode === "sim" && !SEL.touched && e.days.length) {
      let bi = 0; e.days.forEach((d, i) => { if (d.greenHours > e.days[bi].greenHours) bi = i; });
      SEL.dayIdx = bi; SEL.touched = true;
    }
  });

  const D = { R, PARAMS, S, SEL, DATA, EVAL, sync, loading, simLoading, BA, burnairEnabled, burnairLogin, burnairLogout, fetchAll, fetchSim, setMode, refresh, setLevel };
  provide("dash", D);
  return D;
}
export const useDash = () => inject("dash") as ReturnType<typeof useDashboard>;
