<script setup lang="ts">
// @ts-nocheck
import { LEVELS } from "#shared/config";
const D = useDash();
const current = computed(() => LEVELS[D.S.level === "custom" ? D.S.levelBase : D.S.level].name);
const own = computed(() => { const v = D.visit.value; return !v ? "" : v.level === "custom" ? "Eigene Werte" : LEVELS[v.level].name; });
</script>

<template>
  <div v-if="D.visit.value" class="flag warn visit-flag">
    <span><b>Level aus dem Link: {{ current }}.</b> Dein eigenes ist {{ own }}. Wird nicht gespeichert.</span>
    <button type="button" class="btn" @click="D.restoreOwnLevel()">{{ own }} verwenden</button>
  </div>
</template>
