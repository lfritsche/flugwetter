<script setup lang="ts">
// Startseite: zuletzt genutzte Region oder Walgau
const last = import.meta.client ? (localStorage.getItem("flugwetter.region") || "walgau") : "walgau";
await navigateTo(`/${last}`, { replace: true });
</script>
<template><div /></template>
