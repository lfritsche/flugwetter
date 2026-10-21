<script setup lang="ts">
// @ts-nocheck
import { REGIONS } from "#shared/regions";
const route = useRoute();
const id = String(route.params.region);
if (!REGIONS[id]) throw createError({ statusCode: 404, statusMessage: "Region nicht gefunden" });
const D = useDashboard(id);
const settings = ref();
useHead({ title: `Flugwetter ${D.R.areaName}` });
onMounted(() => {
  try { localStorage.setItem("flugwetter.region", id); } catch {}
  document.documentElement.style.setProperty("--bg-img", `url("${D.R.bg}")`);
  D.fetchAll();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && D.S.mode !== "sim" && D.DATA.fetchedAt && Date.now() - +new Date(D.DATA.fetchedAt) > 15 * 60e3) D.fetchAll();
  });
});
</script>

<template>
  <div class="wrap">
    <TopBar @settings="settings?.open()" />
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
