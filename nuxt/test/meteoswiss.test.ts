// @ts-nocheck
import { describe, it, expect } from "vitest";
import { parseVQHA80, parseHourly, parseSlf, parseMsNow, parseGeosphereSamples } from "../server/utils/weather";

describe("MeteoSchweiz-Parser", () => {
  it("VQHA80: Station, km/h, fehlende Werte", () => {
    const csv = "Station/Location;Date;tre200s0;dkl010z0;fu3010z0;fu3010z1\r\nCHU;202611051250;18.3;175.00;8.60;21.60\r\nSRS;202611051250;7.6;-;-;-\r\nXXX;202611051250;1;1;1;1\r\n";
    const r = parseVQHA80(csv, new Set(["CHU", "SRS"]));
    expect(r.ts).toBe("2026-11-05T12:50:00Z");
    expect(r.st.CHU).toEqual({ dir: 175, ff: 8.6, ffx: 21.6, sun: null, rh: null });
    expect(r.st.SRS).toEqual({ dir: null, ff: null, ffx: null, sun: null, rh: null });
    expect(r.st.XXX).toBeUndefined();
  });
  it("Stundenwerte: Intervallende minus 1 h, abgeschnittene erste Zeile, Lokalzeit", () => {
    const head = "station_abbr;reference_timestamp;fu3010h0;fu3010h1;dkl010h0";
    const now = `${head}\r\nCHU;05.11.2026 12:00;11;30;170\r\n`;
    const rec = "kaputte zeile;;\r\nCHU;04.11.2026 23:00;5;9;100\r\n";
    const o = parseHourly(now, rec, 0);
    // Ende 12 UTC = Stunde ab 11 UTC = 12 Uhr Lokalzeit (MEZ)
    expect(o["2026-11-05T12:00"]).toEqual({ dir: 170, ff: 11, ffx: 30 });
    expect(o["2026-11-04T23:00"]).toEqual({ dir: 100, ff: 5, ffx: 9 });
    expect(Object.keys(o)).toHaveLength(2);
  });
  it("t_now: Zeit UTC, Böe, Feuchte, Temperatur", () => {
    const csv = "station_abbr;reference_timestamp;tre200s0;ure200s0;dkl010z0;fu3010z0;fu3010z1\r\nCHU;05.11.2026 13:10;13.4;51.2;12;10;39.6\r\n";
    expect(parseMsNow(csv)[0]).toEqual({ t: "2026-11-05T13:10:00.000Z", g: 39.6, dir: 12, rh: 51.2, ta: 13.4 });
  });
  it("SLF: m/s nach km/h", () => {
    const r = parseSlf([{ measure_date: "2026-11-05T05:30:00Z", VW_30MIN_MAX: 29.3, DW_30MIN_MEAN: 192, RH_30MIN_MEAN: 40, TA_30MIN_MEAN: 3 }]);
    expect(r[0].g).toBeCloseTo(105.48, 1);
    expect(r[0].dir).toBe(192);
  });
  it("GeoSphere: m/s nach km/h, Zeit UTC", () => {
    const r = parseGeosphereSamples({ timestamps: ["2026-11-05T13:40+00:00"], features: [{ properties: { parameters: { FFX: { data: [10] }, DD: { data: [190] }, RF: { data: [50] }, TL: { data: [9] } } } }] });
    expect(r[0]).toEqual({ t: "2026-11-05T13:40:00.000Z", g: 36, dir: 190, rh: 50, ta: 9 });
    expect(parseGeosphereSamples({})).toEqual([]);
  });
});
