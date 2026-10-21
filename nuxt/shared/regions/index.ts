import walgau from "./walgau";
import pustertal from "./pustertal";
export const REGIONS = { walgau, pustertal } as Record<string, any>;
export const REGION_IDS = Object.keys(REGIONS);
