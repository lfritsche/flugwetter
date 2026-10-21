/**
 * Burnair-Proxy für das Flugwetter-Dashboard.
 *
 * Burnair erlaubt Login und Profil nur von eigenen Domains (CORS). Dieser Worker
 *  - leitet den Login mit den Burnair-Zugangsdaten der Nutzerin / des Nutzers weiter (POST /login),
 *  - prüft bei jedem Datenabruf das Token gegen das Burnair-Profil,
 *  - und liefert erst dann die Punktprognose aus (GET /pointforecast).
 * Zugangsdaten werden weder gespeichert noch geloggt. Das Token bleibt im Browser der Person.
 */
const API = "https://api.burnair.cloud";
const UPSTREAM_HEADERS = { Origin: "https://map.burnair.cloud", Referer: "https://map.burnair.cloud/", Accept: "application/json" };
const VERIFY_TTL = 10 * 60 * 1000;
const verified = new Map();   // token-hash → Ablaufzeit (pro Worker-Instanz)

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim());
    const cors = allowed.includes(origin) ? {
      "Access-Control-Allow-Origin": origin, "Vary": "Origin",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Authorization,Content-Type",
    } : null;
    if (!cors) return new Response("Origin nicht erlaubt", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    try {
      if (url.pathname === "/login" && request.method === "POST") {
        const { username, password } = await request.json();
        if (!username || !password) return json({ error: "Benutzername und Passwort fehlen" }, 400);
        const r = await fetch(`${API}/v1/auth`, {
          method: "POST", headers: { ...UPSTREAM_HEADERS, "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!r.ok) return json({ error: "Login bei Burnair fehlgeschlagen" }, 401);
        const t = await r.json();
        const auth = `${t.token_type || "Bearer"} ${t.access_token}`;
        const p = await profile(auth);
        if (!p) return json({ error: "Burnair-Profil nicht lesbar" }, 401);
        verified.set(await hash(auth), Date.now() + VERIFY_TTL);
        return json({ token: auth, expiresIn: t.expires_in, name: p.displayname || p.firstname || "", userType: p.user_type });
      }

      if (url.pathname === "/pointforecast" && request.method === "GET") {
        const auth = request.headers.get("Authorization") || "";
        if (!auth) return json({ error: "Nicht angemeldet" }, 401);
        const key = await hash(auth);
        if (!(verified.get(key) > Date.now())) {
          if (!(await profile(auth))) return json({ error: "Burnair-Login abgelaufen" }, 401);
          verified.set(key, Date.now() + VERIFY_TTL);
        }
        const lat = +url.searchParams.get("lat"), lng = +url.searchParams.get("lng"), date = url.searchParams.get("date") || "";
        if (!isFinite(lat) || !isFinite(lng) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "Parameter ungültig" }, 400);
        const q = new URLSearchParams({ lat: lat.toFixed(5), lng: lng.toFixed(5), date });
        const r = await fetch(`${API}/v1/pointforecast?${q}`, { headers: { ...UPSTREAM_HEADERS, Authorization: auth }, cf: { cacheTtl: 900 } });
        return new Response(r.body, { status: r.status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "private, max-age=900" } });
      }

      return json({ error: "Nicht gefunden" }, 404);
    } catch (e) {
      return json({ error: "Proxy-Fehler" }, 502);
    }
  },
};

async function profile(auth) {
  const r = await fetch(`${API}/v1/users/profile/me`, { headers: { ...UPSTREAM_HEADERS, Authorization: auth } });
  return r.ok ? r.json() : null;
}
async function hash(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}
