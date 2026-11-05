<script setup lang="ts">
// @ts-nocheck
import { REGIONS } from "#shared/regions";
import { LEVEL_SLUGS, levelFromSlug } from "#shared/config";
// Adresse: /<region>/<startplatz>?level=<level>. Tabwechsel bleibt in derselben Seite, nur die Region lädt neu.
definePageMeta({ key: r => String(r.params.region) });
const route = useRoute();
const router = useRouter();
const id = String(route.params.region);
if (!REGIONS[id]) throw createError({ statusCode: 404, statusMessage: "Region nicht gefunden" });
const D = useDashboard(id);
const settings = ref();
const siteName = computed(() => D.R.SITES.find(s => s.id === D.S.tab)?.name);
useHead({ title: () => `${siteName.value} · Flugwetter ${D.R.areaName}` });

// URL → Zustand (auch bei Zurück/Vor)
function fromUrl() {
  const site = route.params.site, known = D.R.SITES.some(s => s.id === site);
  if (known && D.S.tab !== site) { D.S.tab = site; D.SEL.hour = null; }
  const lv = levelFromSlug(route.query.level);
  if (lv != null) D.visitLevel(lv);
}
fromUrl();
watch(() => [route.params.site, route.query.level], fromUrl);
// Zustand → URL. Eigene Grenzwerte haben keinen Level-Parameter.
function toUrl() {
  const level = D.S.level === "custom" ? undefined : LEVEL_SLUGS[D.S.level];
  const path = `/${id}/${D.S.tab}`;
  if (route.path !== path || route.query.level !== level) router.replace({ path, query: { ...route.query, level } });
}
watch(() => [D.S.tab, D.S.level], toUrl);
toUrl();
onMounted(() => {
  try { localStorage.setItem("flugwetter.region", id); } catch {}
  document.documentElement.style.setProperty("--bg-img", `url("${D.R.bg}")`);
  D.fetchAll();
  document.addEventListener("visibilitychange", onVisible);
});
function onVisible() {
  if (document.visibilityState === "visible" && D.S.mode !== "sim" && D.DATA.fetchedAt && Date.now() - +new Date(D.DATA.fetchedAt) > 15 * 60e3) D.fetchAll();
}
onUnmounted(() => document.removeEventListener("visibilitychange", onVisible));
</script>

<template>
  <div class="wrap">
    <TopBar @settings="settings?.open()" />
    <RegionSwitch />
    <ControlsPanel />
    <SiteTabs />
    <HeroPanel />
    <HourTable />
    <ModuleList />
    <footer>
      Vorauswahl aus Wettermodellen. Ersetzt nicht den Blick auf Live-Wind, Himmel und die Einschätzung deines Fluglehrers.
      <span v-html="D.R.credits" />
    </footer>
  </div>
  <SettingsDialog ref="settings" />
</template>
