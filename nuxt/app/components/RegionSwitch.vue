<script setup lang="ts">
// @ts-nocheck
import { REGIONS } from "#shared/regions";
const regions = Object.values(REGIONS);
const route = useRoute();
</script>

<template>
  <nav class="seg regions" aria-label="Region">
    <NuxtLink v-for="r in regions" :key="r.id" :to="{ path: `/${r.id}`, query: route.query }" :aria-current="route.params.region === r.id ? 'page' : undefined">{{ r.areaName }}</NuxtLink>
  </nav>
</template>
