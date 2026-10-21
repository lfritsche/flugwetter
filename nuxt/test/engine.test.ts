// @ts-nocheck
import { describe, it, expect, beforeEach } from "vitest";
import { setCtx, evaluateSite, dirPick, grade, buildBriefing } from "#shared/engine";
import { defaultSettings, presetLimits, makeParams } from "#shared/config";
import { hourRanges, localKey } from "#shared/format";

/* Synthetische Region: ein Südstartplatz (Sektor 160–240) und ein Gipfel mit zwei Starts */
const R = {
  id: "test",
  foehn: {
    primary: { label: "A − B", a: { lat: 0, lon: 0 }, b: { lat: 1, lon: 1 } },
    secondary: { label: "C − D", a: { lat: 0, lon: 0 }, b: { lat: 1, lon: 1 } },
    posName: "Südföhn", negName: "Nordströmung", explain: "",
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
