// @ts-nocheck
import { describe, it, expect } from "vitest";
import { verifyStation } from "#shared/verify";

const T = h => `2026-11-08T${String(h).padStart(2, "0")}:00`;
const model = (d2, ch2) => ({ time: Array.from({ length: 24 }, (_, h) => T(h)), d2: Array(24).fill(d2), ch2: Array(24).fill(ch2) });
const meas = (ffx, hours = [10, 11, 12]) => Object.fromEntries(hours.map(h => [T(h), { ffx }]));

describe("Modell-Trefferquote", () => {
  it("rechnet Abweichung je Modell und für die strenge Regel", () => {
    const r = verifyStation(model(14, 24), meas(12));
    expect(r.n).toBe(3);
    expect(r.bias.d2).toBe(2);
    expect(r.bias.ch2).toBe(12);
    expect(r.bias.strict).toBe(12);
    expect(r.bias.mean).toBe(7);
  });
  it("vergleicht die Messung 10–11 Uhr mit dem Modellwert von 11 Uhr", () => {
    const m = model(10, 10); m.d2[11] = 40; m.ch2[11] = 40;
    const r = verifyStation(m, meas(40, [10]));
    expect(r.bias.strict).toBe(0);
  });
  it("zählt verpasste starke Böen und falsche rote", () => {
    const r = verifyStation(model(20, 30), { [T(10)]: { ffx: 32 }, [T(11)]: { ffx: 10 }, [T(12)]: { ffx: 28 } });
    expect(r.strong).toBe(2);
    expect(r.missed.strict).toBe(0);
    expect(r.missed.mean).toBe(2);   // Mittel 25 liegt nicht über 25
    expect(r.falseRed.strict).toBe(1);
    expect(r.falseRed.mean).toBe(0);
    const r2 = verifyStation(model(16, 20), { [T(10)]: { ffx: 32 } });
    expect(r2.missed.strict).toBe(1);
  });
  it("Trefferquote: gleiche Stufe wie gemessen", () => {
    const r = verifyStation(model(10, 16), { [T(10)]: { ffx: 12 }, [T(11)]: { ffx: 22 } });
    expect(r.hit.strict).toBe(0.5);
    expect(r.hit.mean).toBe(0.5);   // Mittel 13: gleiche Stufe wie 12, nicht wie 22
  });
  it("nur Tagstunden, ohne Daten null", () => {
    expect(verifyStation(model(10, 10), meas(10, [3, 20]))).toBeNull();
    expect(verifyStation(model(10, 10), {})).toBeNull();
  });
  it("Tagesverlauf für die Grafik", () => {
    const r = verifyStation(model(20, 20), meas(10));
    expect(r.days).toEqual([{ day: "2026-11-08", bias: 10, biasMean: 10, obsMax: 10 }]);
  });
});
