<script setup lang="ts">
// @ts-nocheck
// Blatt statt Reiter, damit weitere Regionen einfach dazukommen können. Jede Region steht für sich.
import { REGIONS } from "#shared/regions";
const regions = Object.values(REGIONS);
const route = useRoute();
const dlg = ref<HTMLDialogElement | null>(null);
const close = () => dlg.value?.close();
defineExpose({ open: () => dlg.value?.showModal() });
const places = r => { const n = r.SITES.slice(0, 4).map(s => s.name).join(", "); return r.SITES.length > 4 ? n + " …" : n; };
</script>

<template>
  <dialog ref="dlg" class="region-sheet" aria-label="Region wählen" @click.self="close">
    <div class="region-sheet-body">
      <div class="dlg-head"><h2>Region wählen</h2><button type="button" class="iconbtn" aria-label="Schliessen" @click="close"><svg viewBox="0 0 24 24"><path d="M6 6 L18 18 M18 6 L6 18" /></svg></button></div>
      <nav class="regions" aria-label="Region">
        <NuxtLink v-for="r in regions" :key="r.id" class="region-card" :to="{ path: `/${r.id}`, query: route.query }" :aria-current="route.params.region === r.id ? 'page' : undefined" :style="{ '--thumb': `url(${r.bg})` }" @click="close">
          <b class="rname">{{ r.areaName }}</b>
          <small>{{ r.SITES.length }} Startplätze · {{ places(r) }}</small>
        </NuxtLink>
      </nav>
    </div>
  </dialog>
</template>
