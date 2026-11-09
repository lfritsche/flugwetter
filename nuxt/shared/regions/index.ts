import walgau from "./walgau";
import pustertal from "./pustertal";
import praettigau from "./praettigau";
import liechtenstein from "./liechtenstein";
export const REGIONS = { walgau, pustertal, praettigau, liechtenstein } as Record<string, any>;
export const REGION_IDS = Object.keys(REGIONS);
