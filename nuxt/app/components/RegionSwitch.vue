<script setup lang="ts">
// @ts-nocheck
import { REGIONS } from "#shared/regions";
const regions = Object.values(REGIONS);
</script>

<template>
  <nav class="seg regions" aria-label="Region">
    <NuxtLink v-for="r in regions" :key="r.id" :to="`/${r.id}`">{{ r.areaName }}</NuxtLink>
  </nav>
</template>
