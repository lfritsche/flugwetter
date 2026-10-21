// Ergebnis des letzten Morgen-Checks (oder null)
export default defineEventHandler(async () => (await useStorage("cache").getItem("notify:latest")) ?? null);
