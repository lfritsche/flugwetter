// @ts-nocheck
import { describe, it, expect } from "vitest";
import { rhAtElev, lapseFromStart } from "../server/utils/weather";

const h = {
  geopotential_height_850hPa: [1500], relative_humidity_850hPa: [90], temperature_850hPa: [5],
  geopotential_height_800hPa: [2000], relative_humidity_800hPa: [60], temperature_800hPa: [1],
  geopotential_height_700hPa: [3000], relative_humidity_700hPa: [30], temperature_700hPa: [-6],
};
describe("Profil am Start", () => {
  it("Feuchte linear zwischen Druckflächen", () => { expect(rhAtElev(h, 0, 1750)).toBe(75); });
  it("ausserhalb des Profils null", () => { expect(rhAtElev(h, 0, 900)).toBeNull(); });
  it("Temperaturabnahme Start bis 700 hPa in °C/km", () => { expect(lapseFromStart(h, 0, 1500)).toBe(7.3); });
  it("700 hPa zu nah am Start: null", () => { expect(lapseFromStart(h, 0, 2700)).toBeNull(); });
});
