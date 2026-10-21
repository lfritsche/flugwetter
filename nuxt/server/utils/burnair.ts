/**
 * Burnair-Anbindung (serverseitig).
 * Login und Profil erlaubt Burnair nur von eigenen Domains; der Server leitet daher weiter.
 * Zugangsdaten werden weder gespeichert noch geloggt. Das Token bleibt im Browser der Person
 * und wird bei jedem Abruf gegen das Burnair-Profil geprüft (Ergebnis 10 min gecacht, nur als Hash).
 */
const API = "https://api.burnair.cloud";
const UPSTREAM = { Origin: "https://map.burnair.cloud", Referer: "https://map.burnair.cloud/", Accept: "application/json" };
const VERIFY_TTL = 600;

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function burnairProfile(auth: string) {
  const r = await fetch(`${API}/v1/users/profile/me`, { headers: { ...UPSTREAM, Authorization: auth } });
  return r.ok ? (await r.json() as Record<string, any>) : null;
}

export async function burnairLogin(username: string, password: string) {
  const r = await fetch(`${API}/v1/auth`, {
    method: "POST", headers: { ...UPSTREAM, "Content-Type": "application/json" }, body: JSON.stringify({ username, password }),
  });
  if (!r.ok) return null;
  const t = await r.json() as { token_type?: string; access_token: string; expires_in?: number };
  const auth = `${t.token_type || "Bearer"} ${t.access_token}`;
  const p = await burnairProfile(auth);
  if (!p) return null;
  await useStorage("cache").setItem(`burnair:ok:${await sha256(auth)}`, 1, { ttl: VERIFY_TTL });
  return { token: auth, expiresIn: t.expires_in ?? 3600, name: p.displayname || p.firstname || "", userType: p.user_type };
}

/** Token prüfen (gecacht). Wirft 401, wenn ungültig. */
export async function requireBurnair(auth: string | undefined) {
  if (!auth) throw createError({ statusCode: 401, statusMessage: "Nicht bei Burnair angemeldet" });
  const key = `burnair:ok:${await sha256(auth)}`, store = useStorage("cache");
  if (await store.getItem(key)) return;
  if (!(await burnairProfile(auth))) throw createError({ statusCode: 401, statusMessage: "Burnair-Login abgelaufen" });
  await store.setItem(key, 1, { ttl: VERIFY_TTL });
}

/** Punktprognose für Koordinate und Tag, 15 min gecacht (erst nach Login-Prüfung erreichbar) */
export const burnairPointForecast = defineCachedFunction(async (lat: number, lng: number, date: string) => {
  const q = new URLSearchParams({ lat: lat.toFixed(5), lng: lng.toFixed(5), date });
  const r = await fetch(`${API}/v1/pointforecast?${q}`, { headers: UPSTREAM });
  if (!r.ok) throw createError({ statusCode: 502, statusMessage: `Burnair HTTP ${r.status}` });
  return await r.json();
}, { maxAge: 900, name: "burnair-pf", getKey: (lat: number, lng: number, date: string) => `${lat.toFixed(4)}:${lng.toFixed(4)}:${date}` });
