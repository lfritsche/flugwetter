// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2026-09-01",
  devtools: { enabled: false },
  css: ["~/assets/app.css"],
  app: {
    head: {
      htmlAttrs: { lang: "de" },
      meta: [
        { name: "viewport", content: "width=device-width,initial-scale=1,viewport-fit=cover" },
        { name: "theme-color", content: "#0d1318", media: "(prefers-color-scheme: dark)" },
        { name: "theme-color", content: "#edf1f3", media: "(prefers-color-scheme: light)" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-title", content: "Flugwetter" },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Source+Sans+3:wght@400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" },
      ],
    },
  },
  // Dashboard ist rein clientseitig interaktiv; Server liefert Daten-API + statische Hülle
  ssr: false,
  nitro: {
    preset: "cloudflare_module",
    experimental: { tasks: true },
    // Morgen-Check täglich 05:00 UTC (07:00 Sommerzeit)
    scheduledTasks: { "0 5 * * *": ["notify:morning"] },
    cloudflare: {
      deployConfig: true,
      wrangler: {
        name: "flugwetter",
        triggers: { crons: ["0 5 * * *"] },
        kv_namespaces: [{ binding: "CACHE", id: "REPLACE_WITH_KV_ID" }],
      },
    },
  },
  $production: {
    nitro: { storage: { cache: { driver: "cloudflare-kv-binding", binding: "CACHE" } } },
  },
  $development: {
    nitro: { storage: { cache: { driver: "fs", base: "./.data/cache" } } },
  },
});
