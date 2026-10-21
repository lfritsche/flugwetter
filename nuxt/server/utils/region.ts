import { REGIONS } from "#shared/regions";

/** Region per ID holen oder 404 werfen */
export function getRegion(id: string | undefined) {
  const R = id ? REGIONS[id] : undefined;
  if (!R) throw createError({ statusCode: 404, statusMessage: "Region nicht gefunden" });
  return R;
}

/** Promise.allSettled → { data, errors } mit sprechenden Fehlermeldungen */
export async function settle<T extends Record<string, Promise<unknown>>>(jobs: T) {
  const keys = Object.keys(jobs);
  const res = await Promise.allSettled(Object.values(jobs));
  const data: Record<string, unknown> = {}, errors: Record<string, string> = {};
  res.forEach((r, i) => {
    if (r.status === "fulfilled") data[keys[i]] = r.value;
    else errors[keys[i]] = (r.reason as Error)?.message || String(r.reason);
  });
  return { data, errors };
}
