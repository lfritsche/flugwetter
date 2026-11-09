// @ts-nocheck
import { describe, it, expect, beforeEach } from "vitest";
import { setCtx, evaluateSite, dirPick, grade, foehnGrade, liveFoehnEvents, landFogGrade, liveFogCheck } from "#shared/engine";
import { defaultSettings, presetLimits, makeParams, levelFromSlug } from "#shared/config";
import { hourRanges, localKey } from "#shared/format";

/* Synthetische Region: ein Südstartplatz (Sektor 160–240) und ein Gipfel mit zwei Starts */
const R = {
  id: "test",
  foehn: {
    primary: { label: "A − B", a: { lat: 0, lon: 0 }, b: { lat: 1, lon: 1 } },
    secondary: { label: "C − D", a: { lat: 0, lon: 0 }, b: { lat: 1, lon: 1 } },
    posName: "Südföhn", negName: "Nordströmung", explain: "", mode: "sued", sector: [150, 240],
    live: [{ type: "gust", src: "slf", station: "X1", name: "Spitz", sector: [150, 240], gust: [50, 50, 60, 80] },
      { type: "split", src: "ms", a: "CHU", b: "RAG", nameA: "Chur", nameB: "Ragaz", sector: [120, 220], rhMax: 55, dT: 3 }],
    warnStation: { id: "x", name: "X", sector: [135, 225], dirLabel: "Süd", note: "" },
  },
  SITES: [
    { id: "south", name: "Süd", area: "", lat: 47, lon: 9, elev: 1300, sector: [160, 240], sectorWide: [110, 270], sectorLabel: "S",
      landing: { name: "L", lat: 47, lon: 9, elev: 600 }, historyStation: "st1", measureStation: "st1", measureRole: "landing", rules: [], notes: [], cams: [] },
    { id: "peak", name: "Gipfel", area: "", lat: 47, lon: 9, elev: 2200, sector: [290, 70], sectorLabel: "N/W",
      launches: [
        { name: "Nord", short: "N", sector: [315, 45], sectorWide: [290, 70], sectorLabel: "N", calmOk: true },
        { name: "West", short: "W", sector: [250, 290], sectorWide: [230, 310], sectorLabel: "W" },
        { name: "Südost", short: "SO", sector: [120, 170], sectorLabel: "SO", capYellow: true },
      ],
      landing: { name: "L2", lat: 47, lon: 9, elev: 900 }, historyStation: "st1", rules: [], notes: [], cams: [] },
  ],
  STATIONS: [{ id: "st1", name: "Tal", elev: 600, role: "" }],
};

const DAY = localKey(new Date(Date.now() + 864e5)).slice(0, 10);   // morgen: alles Prognose
const HOURS = Array.from({ length: 24 }, (_, h) => `${DAY}T${String(h).padStart(2, "0")}:00`);

/** Basis: ruhiger, guter Tag. Overrides pro Stunde: (h) => ({ ...werte }) */
function makeData(over = () => ({})) {
  const mk = () => {
    const H = { time: HOURS };
    const set = (k, f) => { for (const m of ["icon_d2", "meteoswiss_icon_ch2", "gfs_seamless"]) H[`${k}_${m}`] = HOURS.map((_, h) => f(h)); };
    const v = (key, base) => h => (over(h)[key] ?? base);
    set("wind_speed_10m", v("ws", 8)); set("wind_gusts_10m", v("gust", 14)); set("wind_direction_10m", v("dir", 200));
    set("wind_speed_850hPa", v("w850", 8)); set("wind_direction_850hPa", v("d850", 200));
    set("wind_speed_700hPa", v("w700", 12)); set("wind_direction_700hPa", v("d700", 220));
    set("cape", v("cape", 0)); set("lifted_index", v("li", 5)); set("precipitation", v("rain", 0));
    set("cloud_base", v("cb", 20900)); set("cloud_cover_low", v("low", 0)); set("boundary_layer_height", v("blh", 900));
    set("visibility", v("vis", 30000)); set("pressure_msl", v("p", 1015)); set("weather_code", v("wx", 1));
    return H;
  };
  const fc = {};
  for (const s of R.SITES) fc[s.id] = { launch: mk(), land: mk(), sun: { [DAY]: { rise: 7 * 60 + 30, set: 18 * 60 + 10 } } };
  const byTime = {}; HOURS.forEach((t, i) => byTime[t] = { bi: over(i).foehn ?? 0, lz: 0 });
  return { fc, foehn: { time: HOURS, bi: HOURS.map((_, i) => byTime[HOURS[i]].bi), lz: HOURS.map(() => 0), byTime }, hist: {}, live: null };
}

function run(siteId, over, level = 0) {
  const S = defaultSettings(R.SITES);
  S.level = level; S.levelBase = level; S.limits = presetLimits(level, makeParams(R.foehn));
  S.tab = siteId;
  const DATA = makeData(over);
  setCtx({ S, DATA, R, SEL: { dayIdx: 1, hour: null }, EVAL: {} });
  const ev = evaluateSite(R.SITES.find(s => s.id === siteId));
  return ev.hours.filter(h => h.day === DAY);
}
const at = (hours, h) => hours.find(x => x.hour === h);

describe("Grundbewertung", () => {
  it("ruhiger Tag am Südstart ist grün (tagsüber)", () => {
    const H = run("south");
    expect(at(H, 11).score.level).toBe(0);
  });
  it("vor Sonnenaufgang und kurz vor Sonnenuntergang rot (Tageslicht)", () => {
    const H = run("south");
    expect(at(H, 6).score.level).toBe(2);
    expect(at(H, 17).score.grades.dark).toBe(2);   // 18:00 > 18:10 − 30 min
    expect(at(H, 16).score.grades.dark).toBeUndefined();
  });
  it("jedes Rot macht die Stunde rot (Böen > 25)", () => {
    const H = run("south", h => (h === 12 ? { gust: 30 } : {}));
    expect(at(H, 12).score.level).toBe(2);
  });
});

describe("Anfänger-Strenge", () => {
  it("gelber Regen verhindert grün bei Anfängern", () => {
    const H = run("south", h => (h === 12 ? { rain: 0.1 } : {}));
    expect(at(H, 12).score.grades.rain).toBe(1);
    expect(at(H, 12).score.level).toBe(1);
  });
  it("Experte darf bei einem gelben Nebenwert grün sein", () => {
    const H = run("south", h => (h === 12 ? { cape: 900 } : {}), 3);   // Experte: CAPE 800/1500 → gelb
    expect(at(H, 12).score.grades.cape).toBe(1);
    expect(at(H, 12).score.level).toBe(0);
  });
});

describe("Lee und Höhenwind", () => {
  it("Höhenwind von hinten (N bei Südstart) ab 20 km/h rot für Anfänger", () => {
    const H = run("south", h => (h === 12 ? { w850: 22, d850: 0 } : {}));
    expect(at(H, 12).score.grades.lee).toBe(2);
  });
  it("700 hPa bei tiefem Start im Hike & Fly höchstens gelb", () => {
    const H = run("south", h => (h === 12 ? { w700: 40, d700: 220 } : {}));
    expect(at(H, 12).score.grades.w700).toBe(1);
  });
  it("700 hPa bei hohem Start (2200 m) voll rot", () => {
    const H = run("peak", h => (h === 12 ? { w700: 40, d700: 300, dir: 0 } : {}));
    expect(at(H, 12).score.grades.w700).toBe(2);
  });
});

describe("Mehrere Startplätze", () => {
  it("wählt bei Westwind den Weststart", () => {
    const H = run("peak", h => (h === 12 ? { dir: 270, d850: 270, d700: 270 } : {}));
    expect(at(H, 12).score.launch.short).toBe("W");
  });
  it("Südost-Start ist für Anfänger höchstens gelb", () => {
    const H = run("peak", h => (h === 12 ? { dir: 145, d850: 145, d700: 145 } : {}));
    expect(at(H, 12).score.launch.short).toBe("SO");
    expect(at(H, 12).score.grades.dir).toBe(1);
  });
  it("dirPick: Sektor über Norden (Wrap 315–45)", () => {
    const S = defaultSettings(R.SITES); S.limits = presetLimits(0, makeParams(R.foehn));
    setCtx({ S, DATA: makeData(), R });
    expect(dirPick(R.SITES[1], 10, 12).launch.short).toBe("N");
    expect(dirPick(R.SITES[1], 350, 12).g).toBe(0);
  });
});

describe("Föhn, Puffer, Front", () => {
  it("Föhn ab 4 hPa rot", () => {
    const H = run("south", h => (h === 12 ? { foehn: 4.5 } : {}));
    expect(at(H, 12).score.grades.foehn).toBe(2);
  });
  it("Puffer: Stunde vor Gewitter-Rot ist nicht mehr grün", () => {
    const H = run("south", h => (h === 14 ? { cape: 1200 } : {}));
    expect(at(H, 14).score.level).toBe(2);
    expect(at(H, 13).score.level).toBe(1);
    expect(at(H, 13).score.grades.buffer).toBe(1);
  });
  it("Druckanstieg ≥3 hPa in 3 h = Front rot", () => {
    const H = run("south", h => ({ p: h >= 12 ? 1019 : 1015 }));
    expect(at(H, 12).score.grades.front).toBe(2);
  });
  it("Sicht unter 1,5 km rot", () => {
    const H = run("south", h => (h === 12 ? { vis: 1000 } : {}));
    expect(at(H, 12).score.grades.vis).toBe(2);
  });
});

describe("Hilfsfunktionen", () => {
  it("grade mit invert (Wolkenbasis)", () => {
    expect(grade(600, { g: 500, r: 300 }, true)).toBe(0);
    expect(grade(400, { g: 500, r: 300 }, true)).toBe(1);
    expect(grade(200, { g: 500, r: 300 }, true)).toBe(2);
  });
  it("hourRanges fasst Abschnitte zusammen", () => {
    expect(hourRanges([8, 9, 10, 14, 15])).toBe("8–11 und 14–16 Uhr");
    expect(hourRanges([12])).toBe("12 Uhr");
  });
});

describe("Föhnregel", () => {
  const ctx = (mode, level = 0, live = null) => {
    const S = defaultSettings(R.SITES); S.level = level; S.levelBase = level; S.limits = presetLimits(level, makeParams(R.foehn));
    setCtx({ S, DATA: { live }, R: { ...R, foehn: { ...R.foehn, mode, sector: mode === "nord" ? [300, 60] : [150, 240] } } });
    return S.limits.foehn;
  };
  it("Praxisfall 5.11.2026: 3 hPa + Südwind 38 km/h ist rot", () => {
    expect(foehnGrade({ foehn: 3, w700: 38, d700: 190 }, ctx("sued"))).toBe(2);
  });
  it("Fehltreffer 13.2.: 1,5 hPa + Südwind 35 km/h ist rot", () => {
    expect(foehnGrade({ foehn: 1.5, w700: 35, d700: 207 }, ctx("sued"))).toBe(2);
  });
  it("ohne Höhenwind gelb ab 2, rot ab 4 hPa", () => {
    const l = ctx("sued");
    expect(foehnGrade({ foehn: 1, w700: 5, d700: 190 }, l)).toBe(0);
    expect(foehnGrade({ foehn: 3, w700: 5, d700: 190 }, l)).toBe(1);
    expect(foehnGrade({ foehn: 4, w700: 5, d700: 190 }, l)).toBe(2);
  });
  it("Wind aus der falschen Richtung löst nichts aus", () => {
    expect(foehnGrade({ foehn: 1, w700: 50, d700: 330 }, ctx("sued"))).toBe(0);
  });
  it("steigender Druck ab 3 hPa ist rot", () => {
    expect(foehnGrade({ foehn: 3, foehnTrend: 1.2, w700: 5, d700: 300 }, ctx("sued"))).toBe(2);
  });
  it("Nordföhn: rot ab 3 hPa, Nordwind + 1,5 hPa rot", () => {
    const l = ctx("nord");
    expect(foehnGrade({ foehn: 3, w700: 5, d700: 180 }, l)).toBe(2);
    expect(foehnGrade({ foehn: 1.5, w700: 25, d700: 350 }, l)).toBe(2);
    expect(foehnGrade({ foehn: 1, w700: 40, d700: 350 }, l)).toBe(1);
  });
  it("Experte: 3 hPa + 30 km/h nicht rot, 3 hPa + 35 km/h rot", () => {
    const l = ctx("sued", 3);
    expect(foehnGrade({ foehn: 3, w700: 30, d700: 190 }, l)).toBe(1);
    expect(foehnGrade({ foehn: 3, w700: 35, d700: 190 }, l)).toBe(2);
  });
  it("keine Druckdaten: keine Bewertung", () => {
    expect(foehnGrade({ foehn: null, w700: 40, d700: 190 }, ctx("sued"))).toBeNull();
  });
});

describe("Föhn gemessen", () => {
  const now = Date.now(), iso = m => new Date(now - m * 60e3).toISOString();
  const run = (samples, level = 0) => {
    const S = defaultSettings(R.SITES); S.level = level; S.levelBase = level; S.limits = presetLimits(level, makeParams(R.foehn));
    setCtx({ S, DATA: { live: { foehnSamples: samples } }, R });
    return liveFoehnEvents(now);
  };
  it("Spitz über Schwelle aus Süd löst aus, für Experten erst ab 80", () => {
    const s = { "slf:X1": [{ t: iso(30), g: 70, dir: 190 }] };
    expect(run(s)[0].lv).toBe(2);
    expect(run(s, 3)).toEqual([]);
  });
  it("aus Nord oder älter als 3 h: nichts", () => {
    expect(run({ "slf:X1": [{ t: iso(30), g: 90, dir: 10 }] })).toEqual([]);
    expect(run({ "slf:X1": [{ t: iso(13 * 60), g: 90, dir: 190 }] })).toEqual([]);
    const older = run({ "slf:X1": [{ t: iso(200), g: 90, dir: 190 }] })[0];   // nach der Haltezeit: gelb
    expect(older.active).toBe(false);
    expect(older.lv).toBe(1);
  });
  it("Chur warm/trocken und Ragaz kalt: Kaltluftsee-Split", () => {
    const t = iso(20);
    expect(run({ "ms:CHU": [{ t, dir: 175, rh: 36, ta: 18 }], "ms:RAG": [{ t, ta: 7 }] })[0].value).toContain("Chur warm");
    expect(run({ "ms:CHU": [{ t, dir: 175, rh: 70, ta: 18 }], "ms:RAG": [{ t, ta: 7 }] })).toEqual([]);
  });
  it("Kamm und Tal getrennt: Tal hat Vorrang im Text", () => {
    const RR = { ...R, foehn: { ...R.foehn, live: [
      { type: "gust", kind: "kamm", src: "slf", station: "K", name: "Spitz", sector: [150, 240], gust: [50, 50, 60, 80] },
      { type: "gust", kind: "tal", src: "geo", station: "T", name: "Brand", sector: [150, 240], gust: [25, 25, 35, 40] },
    ] } };
    const S = defaultSettings(R.SITES); S.limits = presetLimits(0, makeParams(R.foehn));
    const go = s => { setCtx({ S, DATA: { live: { foehnSamples: s } }, R: RR }); return liveFoehnEvents(now); };
    const kamm = go({ "slf:K": [{ t: iso(10), g: 100, dir: 190 }] });
    expect(kamm[0].kind).toBe("kamm");
    expect(kamm[0].text).toContain("Tal kann noch ruhig sein");
    const beide = go({ "slf:K": [{ t: iso(10), g: 100, dir: 190 }], "geo:T": [{ t: iso(40), g: 30, dir: 190 }] });
    expect(beide[0].kind).toBe("tal");
    expect(beide[0].text).toContain("Föhn im Tal gemessen");
  });
  it("Lücke: keine Änderung", () => {
    expect(run({})).toEqual([]);
  });
  it("macht laufende Stunde + 3 h rot, nicht weiter", () => {
    const S = defaultSettings(R.SITES); S.limits = presetLimits(0, makeParams(R.foehn)); S.tab = "south";
    const NOW = localKey(new Date()), T = Array.from({ length: 12 }, (_, i) => localKey(new Date(now + i * 3600e3)));
    const mk = () => { const H = { time: T }; for (const k of ["wind_speed_10m", "wind_gusts_10m", "wind_direction_10m"]) H[`${k}_icon_d2`] = T.map(() => (k.includes("dir") ? 200 : 5)); return H; };
    const DATA = { fc: { south: { launch: mk(), land: mk() } }, foehn: null, hist: {}, live: { foehnSamples: { "slf:X1": [{ t: iso(0), g: 70, dir: 190 }] } } };
    setCtx({ S, DATA, R, SEL: { dayIdx: 0, hour: null }, EVAL: {} });
    const H = evaluateSite(R.SITES[0]).hours;
    expect(H.find(h => h.t === NOW).score.grades.foehnLive).toBe(2);
    expect(H.find(h => h.t === T[3]).score.grades.foehnLive).toBe(2);
    expect(H.find(h => h.t === T[5]).score.grades.foehnLive ?? 0).toBeLessThan(2);   // nach der Haltezeit höchstens gelb
  });
});

describe("Nebel am Landeplatz", () => {
  it("Sicht und Nebelcode", () => {
    expect(landFogGrade({ landVis: 140 })).toBe(2);
    expect(landFogGrade({ landVis: 30000, landFogCode: true })).toBe(2);
    expect(landFogGrade({ landVis: 3000 })).toBe(1);
    expect(landFogGrade({ landVis: 11800, landLow: 88, landSpread: 2.3 })).toBe(1);   // Vaduz 5.11.: Hochnebel mit gehobener Basis
    expect(landFogGrade({ landVis: 30000, landLow: 100, landSpread: 5 })).toBe(0);
    expect(landFogGrade({ landVis: 30000, landLow: 0, landSpread: 0.5 })).toBe(0);
    expect(landFogGrade({})).toBeNull();
  });
  it("Start frei, unten Nebel: Stunde rot, auch für Experten", () => {
    for (const level of [0, 3]) {
      const S = defaultSettings(R.SITES); S.level = level; S.levelBase = level; S.limits = presetLimits(level, makeParams(R.foehn)); S.tab = "south";
      const DATA = makeData();
      DATA.fc.south.land.visibility_icon_d2 = HOURS.map((_, h) => (h === 11 ? 140 : 30000));
      setCtx({ S, DATA, R, SEL: { dayIdx: 1, hour: null }, EVAL: {} });
      const hr = evaluateSite(R.SITES[0]).hours.find(x => x.t === `${DAY}T11:00`);
      expect(hr.score.grades.landFog).toBe(2);
      expect(hr.score.level).toBe(2);
    }
  });
  it("Nebel-Check: unten dunkel und feucht, oben Sonne", () => {
    const S = defaultSettings(R.SITES);
    const RR = { ...R, fogCheck: { low: ["a"], high: ["b"] } };
    const go = st => { setCtx({ S, DATA: { live: { st } }, R: RR }); return liveFogCheck(); };
    expect(go({ a: { sun: 0.2, rh: 85 }, b: { sun: 1 } }).active).toBe(true);
    expect(go({ a: { sun: 0.2, rh: 85 }, b: { sun: 0.1 } }).active).toBe(false);
    expect(go({ a: { sun: 0.2, rh: 50 }, b: { sun: 1 } }).active).toBe(false);
    expect(go({}).active).toBe(false);
  });
});

describe("Review: nie grün ohne Klärung", () => {
  it("guidedOnly bleibt für Anfänger gelb, für Erfahrene nicht gesperrt", () => {
    const site = { ...R.SITES[0], guidedOnly: "Nur mit Einweisung" };
    const go = level => {
      const S = defaultSettings(R.SITES); S.level = level; S.levelBase = level; S.limits = presetLimits(level, makeParams(R.foehn)); S.tab = "south";
      setCtx({ S, DATA: makeData(), R: { ...R, SITES: [site, R.SITES[1]] }, SEL: { dayIdx: 1, hour: null }, EVAL: {} });
      return evaluateSite(site).hours.find(x => x.t === `${DAY}T11:00`).score;
    };
    expect(go(0).level).toBe(1);
    expect(go(0).grades.guided).toBe(1);
    expect(go(2).grades.guided).toBeUndefined();
  });
  it("ohne Föhndaten nicht grün", () => {
    const S = defaultSettings(R.SITES); S.limits = presetLimits(0, makeParams(R.foehn)); S.tab = "south";
    const DATA = makeData(); DATA.foehn = null;
    setCtx({ S, DATA, R, SEL: { dayIdx: 1, hour: null }, EVAL: {} });
    expect(evaluateSite(R.SITES[0]).hours.find(x => x.t === `${DAY}T11:00`).score.level).toBe(1);
  });
});

describe("Nebel: Review 2", () => {
  const scoreAt = (mutate, hour = 11) => {
    const S = defaultSettings(R.SITES); S.limits = presetLimits(0, makeParams(R.foehn)); S.tab = "south";
    const DATA = makeData(); mutate(DATA);
    setCtx({ S, DATA, R, SEL: { dayIdx: 1, hour: null }, EVAL: {} });
    return evaluateSite(R.SITES[0]).hours.find(x => x.t === `${DAY}T${String(hour).padStart(2, "0")}:00`).score;
  };
  it("ohne ICON-D2-Sicht am Landeplatz für Anfänger nicht grün", () => {
    const sc = scoreAt(D => { D.fc.south.land.visibility_icon_d2 = HOURS.map(() => null); });
    expect(sc.grades.landFog).toBe(1);
    expect(sc.level).toBe(1);
  });
  it("Stunde vor Nebel unten ist nicht mehr grün", () => {
    const sc = scoreAt(D => { D.fc.south.land.visibility_icon_d2 = HOURS.map((_, h) => (h === 12 ? 100 : 30000)); });
    expect(sc.grades.buffer).toBe(1);
    expect(sc.level).toBe(1);
  });
});

describe("URL-Level", () => {
  it("Namen, Grossschreibung, Unsinn", () => {
    expect(levelFromSlug("erfahren")).toBe(2);
    expect(levelFromSlug("EXPERTE")).toBe(3);
    expect(levelFromSlug("quatsch")).toBeNull();
    expect(levelFromSlug(undefined)).toBeNull();
  });
});

describe("Review 8.11.: falscher Alarm an Inversionstagen", () => {
  const cloudLv = H => H.score.grades.cloud;
  it("Basis unter dem Start bei guter Sicht ist nur gelb", () => {
    const H = run("south", () => ({ cb: 1250, vis: 30000 }));
    expect(cloudLv(at(H, 11))).toBe(1);
  });
  it("Basis unter dem Start mit schlechter Sicht bleibt rot", () => {
    const H = run("south", () => ({ cb: 1250, vis: 1200 }));
    expect(cloudLv(at(H, 11))).toBe(2);
  });
  it("Böigkeit ist nie schlechter als die Böe selbst", () => {
    const H = run("south", () => ({ ws: 6, gust: 22 }));   // Böigkeit 16 (rot), Böe 22 (gelb)
    expect(at(H, 13).score.grades.gust).toBe(1);
    expect(at(H, 13).score.grades.spread).toBe(1);
  });
  it("starke Böen bleiben rot", () => {
    const H = run("south", () => ({ ws: 10, gust: 35 }));
    expect(at(H, 13).score.grades.gust).toBe(2);
    expect(at(H, 13).score.level).toBe(2);
  });

  // Gemessene Sonne auf Starthöhe schlägt die Modell-Wolkenbasis (nur gemessene Stunden)
  function runSun(stationElev, sunFrac) {
    const S = defaultSettings(R.SITES);
    S.mode = "sim"; S.tab = "south";
    const D = makeData(() => ({ cb: 1250, vis: 30000 }));
    const R2 = { ...R, sunStations: ["sun1"], STATIONS: [...R.STATIONS, { id: "sun1", name: "Sonnberg", elev: stationElev, lat: 47.05, lon: 9.05 }] };
    const hist = { sun1: Object.fromEntries(HOURS.map(t => [t, { ff: 3, ffx: 6, dir: 180, sun: sunFrac }])) };
    setCtx({ S, DATA: { simFc: D.fc, simFoehn: D.foehn, simHist: hist, live: null }, R: R2, SEL: { dayIdx: 0, hour: null }, EVAL: {} });
    return evaluateSite(R2.SITES[0]).hours.filter(h => h.day === DAY);
  }
  it("Sonne auf Starthöhe gemessen: Wolkenbasis grün", () => {
    const h = at(runSun(1200, 1), 11);
    expect(cloudLv(h)).toBe(0);
    expect(h.score.reasons.find(r => r.key === "cloud").value).toContain("Sonnberg");
  });
  it("Sonne nur im Tal gemessen zählt nicht", () => {
    expect(cloudLv(at(runSun(600, 1), 11))).toBe(1);
  });
  it("wenig Sonne gemessen ändert nichts", () => {
    expect(cloudLv(at(runSun(1200, 0.3), 11))).toBe(1);
  });
  it("keine Sonne gemessen bestätigt die Wolken: rot", () => {
    expect(cloudLv(at(runSun(1200, 0), 11))).toBe(2);
  });
  it("Basis unter dem Start ohne Messung ist auch für Erfahrene nie grün", () => {
    const H = run("south", () => ({ cb: 1250, vis: 30000 }), 2);
    expect(at(H, 11).score.level).toBe(1);
  });
});
