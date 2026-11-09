<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import type { DetectedRunners, Settings, WindowsRunner } from '../../../../shared/types'
import { t } from '../../i18n'
import AppSelect from '../AppSelect.vue'
import SettingsGroup from './SettingsGroup.vue'
import SettingsRow from './SettingsRow.vue'

/** Windows fangames on Linux / macOS: Wine command, Proton (detected in Steam) or a Bottles bottle */
const props = defineProps<{ settings: Settings }>()
const emit = defineEmits<{ save: [patch: Partial<Settings>] }>()

const found = shallowRef<DetectedRunners>()
onMounted(async () => (found.value = await window.offli.detectRunners()))

const wine = ref(props.settings.winePath)
const bottle = ref(props.settings.bottlesBottle)
const missing = (ok: boolean | undefined): string => (found.value && !ok ? ` (${t('settings.notFound')})` : '')
const runnerOptions = computed(() => [
  { value: 'wine' as WindowsRunner, label: 'Wine' + missing(found.value?.wine) },
  { value: 'proton' as WindowsRunner, label: 'Proton' + missing(!!found.value?.protons.length) },
  { value: 'bottles' as WindowsRunner, label: 'Bottles' + missing(found.value?.bottles) }
])
const runner = computed({
  get: () => props.settings.windowsRunner,
  set: (r: WindowsRunner) => {
    const patch: Partial<Settings> = { windowsRunner: r }
    // First pick: the newest detected Proton, and how Bottles is installed
    if (r === 'proton' && !props.settings.protonPath && found.value?.protons.length)
      patch.protonPath = found.value.protons.at(-1)!.path
    if (r === 'bottles' && found.value) patch.bottlesFlatpak = found.value.bottlesFlatpak
    emit('save', patch)
  }
})
const protonOptions = computed(() => {
  const list = (found.value?.protons ?? []).map((p) => ({ value: p.path, label: p.name }))
  // A version picked before stays listed, even if it's gone
  if (props.settings.protonPath && !list.some((o) => o.value === props.settings.protonPath))
    list.push({ value: props.settings.protonPath, label: props.settings.protonPath })
  return list.length ? list : [{ value: '', label: t('settings.protonNone') }]
})
const proton = computed({
  get: () => props.settings.protonPath,
  set: (protonPath: string) => emit('save', { protonPath })
})
</script>

<template>
  <SettingsGroup :title="t('settings.wineGroup')">
    <SettingsRow :label="t('settings.runner')" :desc="t('settings.runnerDesc')" html-for="set-runner">
      <AppSelect id="set-runner" v-model="runner" class="settings-select" :options="runnerOptions" />
    </SettingsRow>
    <SettingsRow v-if="runner === 'wine'" label="Wine" :desc="t('settings.wineDesc')" html-for="set-wine">
      <input id="set-wine" v-model="wine" class="input settings-path-input" @blur="emit('save', { winePath: wine })" />
    </SettingsRow>
    <SettingsRow
      v-else-if="runner === 'proton'"
      :label="t('settings.proton')"
      :desc="t('settings.protonDesc')"
      html-for="set-proton"
    >
      <AppSelect id="set-proton" v-model="proton" class="settings-select" :options="protonOptions" />
    </SettingsRow>
    <SettingsRow v-else :label="t('settings.bottle')" :desc="t('settings.bottleDesc')" html-for="set-bottle">
      <input
        id="set-bottle"
        v-model="bottle"
        class="input settings-path-input"
        placeholder="Pokemon"
        @blur="emit('save', { bottlesBottle: bottle.trim() })"
      />
    </SettingsRow>
  </SettingsGroup>
</template>
