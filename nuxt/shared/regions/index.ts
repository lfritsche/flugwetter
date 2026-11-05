import walgau from "./walgau";
import pustertal from "./pustertal";
import praettigau from "./praettigau";
export const REGIONS = { walgau, pustertal, praettigau } as Record<string, any>;
export const REGION_IDS = Object.keys(REGIONS);
