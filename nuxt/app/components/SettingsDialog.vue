<script setup lang="ts">
// Einstellungen: Burnair-Login, Grenzwerte, Zeitraum, Module. Änderungen werden erst bei „Speichern“ übernommen.
// @ts-nocheck
import { LEVELS, EXTRA_DEFS, MODULE_IDS, presetLimits } from "#shared/config";
const D = useDash();
const dlg = ref<HTMLDialogElement | null>(null);
const TITLES = { live: "Live am Start", profile: "Windprofil", map3d: "3D-Karte " + D.R.areaName, history: "Windverlauf", foehn: "Föhn-Barometer", aloft: "Höhenwind & Gewitter", site: "Startplatz-Info", links: "Links" };
const form = reactive({ limits: JSON.parse(JSON.stringify(D.S.limits)), extra: { ...D.S.extra }, modules: { ...D.S.modules }, order: D.S.order.slice() as string[] });
function open() {
  form.limits = JSON.parse(JSON.stringify(D.S.limits)); form.extra = { ...D.S.extra };
  form.modules = { ...D.S.modules }; form.order = D.S.order.slice();
  dlg.value?.showModal();
}
defineExpose({ open });
function move(id: string, dir: number) { const i = form.order.indexOf(id), j = i + dir; [form.order[i], form.order[j]] = [form.order[j], form.order[i]]; }
function save() {
  const S = D.S, num = (v, fb) => (isFinite(parseFloat(v)) ? parseFloat(v) : fb);
  D.PARAMS.forEach(p => S.limits[p.key] = { g: num(form.limits[p.key].g, S.limits[p.key].g), r: num(form.limits[p.key].r, S.limits[p.key].r) });
  const oldSim = S.extra.simDays;
  EXTRA_DEFS.forEach(d => S.extra[d.key] = num(form.extra[d.key], S.extra[d.key]));
  S.extra.hourFrom = Math.max(0, Math.min(23, Math.round(S.extra.hourFrom)));
  S.extra.hourTo = Math.max(S.extra.hourFrom, Math.min(23, Math.round(S.extra.hourTo)));
  S.extra.simDays = Math.max(7, Math.min(90, Math.round(S.extra.simDays)));
  MODULE_IDS.forEach(id => S.modules[id] = !!form.modules[id]); S.order = form.order.slice();
  const match = LEVELS.findIndex((_, i) => D.PARAMS.every(p => { const a = presetLimits(i, D.PARAMS)[p.key], b = S.limits[p.key]; return a.g === b.g && a.r === b.r; }));
  if (match >= 0) { S.level = match; S.levelBase = match; } else { if (S.level !== "custom") S.levelBase = S.level; S.level = "custom"; }
  dlg.value?.close();
  if (S.extra.simDays !== oldSim) { D.DATA.simFc = null; if (S.mode === "sim") D.fetchSim(); }
}
const resetArmed = ref(false);
function reset() {
  if (!resetArmed.value) { resetArmed.value = true; setTimeout(() => resetArmed.value = false, 4000); return; }
  resetArmed.value = false; D.setLevel(0); D.S.flight = "hf";
  EXTRA_DEFS.forEach(d => D.S.extra[d.key] = d.v); MODULE_IDS.forEach(id => D.S.modules[id] = true); D.S.order = MODULE_IDS.slice();
  open();
}
// Burnair
const ba = reactive({ user: "", pass: "", status: "", busy: false });
async function login() {
  ba.busy = true; ba.status = "Melde an…";
  try { await D.burnairLogin(ba.user.trim(), ba.pass); ba.pass = ""; ba.status = "Angemeldet."; }
  catch (e) { ba.status = e.message; }
  ba.busy = false;
}
</script>

<template>
  <dialog ref="dlg" aria-labelledby="set-title">
    <form class="dlg" method="dialog" @submit.prevent>
      <div class="dlg-head">
        <h2 id="set-title">Einstellungen</h2>
        <button class="iconbtn" type="button" aria-label="Schließen" @click="dlg?.close()"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
      </div>
      <div class="hint">Gespeichert nur auf diesem Gerät. Änderst du einen Grenzwert, steht der Regler auf „Eigene Werte“. Bei Wolkenbasis und Lifted Index ist kleiner schlechter (↓).</div>

      <fieldset v-if="D.burnairEnabled">
        <legend>Burnair</legend>
        <template v-if="D.BA.value">
          <div class="hint">Angemeldet als <b>{{ D.BA.value.name }}</b>. Wind auf Starthöhe, Basis und Thermik kommen aus Burnair.</div>
          <div class="btn-row"><button type="button" class="btn" @click="D.burnairLogout()">Abmelden</button></div>
        </template>
        <template v-else>
          <div class="hint">Mit deinem Burnair-Konto anmelden, um bessere Punktprognosen einzubinden. Das Passwort wird nicht gespeichert, nur ein Burnair-Token in diesem Browser.</div>
          <div class="one-row" style="grid-template-columns:90px 1fr"><label for="ba-user">E-Mail</label><input id="ba-user" v-model="ba.user" type="email" autocomplete="username" style="text-align:left"></div>
          <div class="one-row" style="grid-template-columns:90px 1fr"><label for="ba-pass">Passwort</label><input id="ba-pass" v-model="ba.pass" type="password" autocomplete="current-password" style="text-align:left"></div>
          <div class="btn-row"><span class="hint" style="flex:1">{{ ba.status }}</span><button type="button" class="btn primary" :disabled="ba.busy" @click="login">Anmelden</button></div>
        </template>
      </fieldset>

      <fieldset>
        <legend>Grenzwerte</legend>
        <div class="lim-row head"><span /><span>grün bis</span><span>rot über</span></div>
        <div v-for="p in D.PARAMS" :key="p.key" class="lim-row">
          <label :for="`lim-${p.key}-g`">{{ p.label }} <span v-if="p.unit" class="muted">({{ p.unit }})</span>{{ p.invert ? " ↓" : "" }}</label>
          <input :id="`lim-${p.key}-g`" v-model="form.limits[p.key].g" type="number" step="any" inputmode="decimal">
          <input :id="`lim-${p.key}-r`" v-model="form.limits[p.key].r" type="number" step="any" inputmode="decimal" :aria-label="`${p.label} rot`">
        </div>
      </fieldset>
      <fieldset>
        <legend>Zeitraum & Sonstiges</legend>
        <div v-for="d in EXTRA_DEFS" :key="d.key" class="one-row">
          <label :for="`ex-${d.key}`">{{ d.label }} <span class="muted">({{ d.unit }})</span></label>
          <input :id="`ex-${d.key}`" v-model="form.extra[d.key]" type="number" step="any" inputmode="decimal">
        </div>
      </fieldset>
      <fieldset>
        <legend>Module</legend>
        <div v-for="(id, i) in form.order" :key="id" class="mod-row">
          <label :for="`mod-on-${id}`"><input :id="`mod-on-${id}`" v-model="form.modules[id]" type="checkbox"> {{ TITLES[id] }}</label>
          <button type="button" :aria-label="`${TITLES[id]} nach oben`" :disabled="i === 0" @click="move(id, -1)">↑</button>
          <button type="button" :aria-label="`${TITLES[id]} nach unten`" :disabled="i === form.order.length - 1" @click="move(id, 1)">↓</button>
        </div>
      </fieldset>
      <div class="btn-row">
        <button type="button" class="btn" @click="reset">{{ resetArmed ? "Wirklich? Nochmal tippen" : "Alles auf Anfänger zurücksetzen" }}</button>
        <button type="button" class="btn primary" @click="save">Speichern</button>
      </div>
    </form>
  </dialog>
</template>
