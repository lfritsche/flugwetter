// Morgen-Check: bewertet alle Regionen mit Anfänger-Standardwerten und speichert die grünen Fenster.
// Grundlage für spätere Benachrichtigungen (WhatsApp / Web-Push); verschickt selbst noch nichts.
import { REGIONS } from "#shared/regions";
import { setCtx, evaluateSite } from "#shared/engine";
import { defaultSettings, presetLimits, makeParams } from "#shared/config";
import { fetchForecast, fetchFoehn, PROVIDERS, OM_LIVE, MODELS_LIVE } from "../../utils/weather";

export default defineTask({
  meta: { name: "notify:morning", description: "Grüne Fenster der nächsten 3 Tage ermitteln" },
  async run() {
    const summary: Record<string, unknown> = {};
    for (const [id, R] of Object.entries(REGIONS)) {
      const { data, errors } = await settle({
        fc: fetchForecast(R, OM_LIVE, { past_days: "1", forecast_days: "3" }, MODELS_LIVE),
        foehn: fetchFoehn(R, OM_LIVE, { forecast_days: "3" }),
        hist: PROVIDERS[R.stationProvider].history(R, 36),
        live: PROVIDERS[R.stationProvider].live(R),
      });
      if (!data.fc) { summary[id] = { error: errors.fc }; continue; }
      const S = defaultSettings(R.SITES);
      S.limits = presetLimits(0, makeParams(R.foehn));
      setCtx({ S, DATA: data, R });
      summary[id] = R.SITES.map((s: any) => {
        const ev = evaluateSite(s);
        return { site: s.id, name: s.name, days: ev.days.map((d: any) => ({ day: d.key, best: d.best, greenHours: d.greenHours })) };
      });
    }
    const result = { at: new Date().toISOString(), summary };
    await useStorage("cache").setItem("notify:latest", result);
    return { result };
  },
});
