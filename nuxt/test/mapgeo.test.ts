// @ts-nocheck
import { describe, it, expect } from "vitest";
import { regionBBox, gridPoints, gridAt, fanPolygon, glidePath, fogTopFrom, reliefColor, bearing, distM, GLIDE } from "#shared/mapgeo";
import { REGIONS } from "#shared/regions";

describe("Raster", () => {
  const b = { s: 0, n: 1, w: 0, e: 1 };
  it("Rahmen enthält alle Plätze", () => {
    for (const R of Object.values(REGIONS)) {
      const x = regionBBox(R);
      for (const s of R.SITES) { expect(s.lat).toBeGreaterThan(x.s); expect(s.lat).toBeLessThan(x.n); expect(s.lon).toBeGreaterThan(x.w); expect(s.lon).toBeLessThan(x.e); }
    }
  });
  it("Punkte zeilenweise, Interpolation bilinear", () => {
    expect(gridPoints(b, 2)).toEqual([{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }, { lat: 1, lon: 0 }, { lat: 1, lon: 1 }]);
    expect(gridAt(b, 2, [0, 10, 20, 30], 0.5, 0.5)).toBe(15);
    expect(gridAt(b, 2, [0, 10, 20, 30], 1, 1)).toBe(30);
    expect(gridAt(b, 2, [0, 10, 20, 30], 1.1, 0.5)).toBeNull();
    expect(gridAt(b, 2, [null, 10, 20, 30], 0.2, 0.2)).toBeNull();
  });
});

describe("Sektorfächer", () => {
  it("Südfächer liegt südlich, Wrap über Nord funktioniert", () => {
    const south = fanPolygon(47, 9, [135, 225]);
    expect(south.slice(1, -1).every(p => p[1] <= 47)).toBe(true);
    const north = fanPolygon(47, 9, [315, 45]);
    expect(north.slice(1, -1).every(p => p[1] >= 47)).toBe(true);
    expect(north[0]).toEqual(north[north.length - 1]);
  });
});

describe("Gleitpfad", () => {
  const start = { lat: 47.0, lon: 9.7, elev: 1700 }, land = { lat: 46.97, lon: 9.66, elev: 610 };
  const flat = [{ d: 500, h: 1300 }, { d: 2000, h: 900 }, { d: 4000, h: 620 }];
  it("Geometrie plausibel", () => {
    expect(distM(start, land)).toBeGreaterThan(4000);
    expect(bearing(start, land)).toBeGreaterThan(180);
    expect(bearing(start, land)).toBeLessThan(270);
  });
  it("ruhig und frei: grün mit Reserve", () => {
    const g = glidePath({ start, land, wind: null, samples: flat });
    expect(g.level).toBe(0);
    expect(g.reserve).toBeGreaterThan(GLIDE.yellow.reserve);
  });
  it("starker Gegenwind: rot, Rückenwind verlängert", () => {
    const track = bearing(start, land);
    const head = glidePath({ start, land, wind: { speed: 30, dir: track }, samples: flat });   // Wind von vorn
    const tail = glidePath({ start, land, wind: { speed: 15, dir: (track + 180) % 360 }, samples: flat });
    expect(head.level).toBe(2);
    expect(head.reserve).toBeLessThan(tail.reserve);
    expect(glidePath({ start, land, wind: { speed: 40, dir: track }, samples: flat }).level).toBe(2);
  });
  it("Rücken im Weg: rot, auch bei Reserve am Ziel", () => {
    const g = glidePath({ start, land, wind: null, samples: [{ d: 2000, h: 1500 }] });
    expect(g.clearance).toBeLessThan(GLIDE.red.clearance);
    expect(g.level).toBe(2);
    expect(g.reason).toContain("Gelände");
  });
  it("Startnahes Gelände zählt nicht", () => {
    expect(glidePath({ start, land, wind: null, samples: [{ d: 100, h: 1699 }] }).clearance).toBeNull();
  });
});

describe("Nebel und Wolken", () => {
  it("Obergrenze zwischen Tal und freiem Start", () => {
    expect(fogTopFrom([{ elev: 650, fog: true }, { elev: 1305, fog: false }])).toBe(770);
    expect(fogTopFrom([{ elev: 650, fog: true }, { elev: 700, fog: false }])).toBe(670);
    expect(fogTopFrom([{ elev: 650, fog: false }])).toBeNull();
    expect(fogTopFrom([{ elev: 650, fog: true }, { elev: 720, fog: false }, { elev: 760, fog: false }])).toBe(690);
  });
  it("Farbausdruck aufsteigend, leer ohne Nebel und Wolken", () => {
    expect(reliefColor({})).toBeNull();
    for (const c of [{ fogTop: 800 }, { cloudBase: 2000 }, { fogTop: 800, cloudBase: 2000 }, { fogTop: 1900, cloudBase: 2000 }]) {
      const e = reliefColor(c).slice(3).filter(x => typeof x === "number");
      expect(e).toEqual([...e].sort((a, b) => a - b));
      expect(new Set(e).size).toBe(e.length);
    }
  });
});
