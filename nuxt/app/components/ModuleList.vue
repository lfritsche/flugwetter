<script setup lang="ts">
// Module in der vom Nutzer gewählten Reihenfolge (Einstellungen)
// @ts-nocheck
import LiveModule from "./modules/LiveModule.vue";
import Map3dModule from "./modules/Map3dModule.vue";
import HtmlModule from "./modules/HtmlModule.vue";
import { renderProfile, renderHistory, renderFoehn, renderAloft, renderSiteInfo, renderLinks } from "~/utils/views";
const D = useDash();
const REG = {
  live: { comp: LiveModule }, map3d: { comp: Map3dModule },
  profile: { render: renderProfile }, history: { render: renderHistory }, foehn: { render: () => renderFoehn() },
  aloft: { render: renderAloft }, site: { render: renderSiteInfo }, links: { render: renderLinks },
};
const list = computed(() => D.S.order.filter(id => D.S.modules[id] && REG[id]));
</script>

<template>
  <div class="modules">
    <template v-for="id in list" :key="id">
      <component :is="REG[id].comp" v-if="REG[id].comp" />
      <HtmlModule v-else :render="REG[id].render" />
    </template>
  </div>
</template>
