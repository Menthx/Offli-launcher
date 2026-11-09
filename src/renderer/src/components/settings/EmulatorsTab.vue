<script setup lang="ts">
import type { EmulatorPlatform, Settings } from '../../../../shared/types'
import { type TKey, t } from '../../i18n'
import Icon from '../Icon.vue'
import SettingsGroup from './SettingsGroup.vue'
import RunnerGroup from './RunnerGroup.vue'
import SettingsRow from './SettingsRow.vue'

/** Console names stay untranslated; hints are translation keys */
const EMULATORS: { id: EmulatorPlatform; label: string; hint: TKey | string }[] = [
  { id: 'gba', label: 'Game Boy Advance', hint: 'settings.hintMgba' },
  { id: 'gb', label: 'Game Boy', hint: 'settings.hintGb' },
  { id: 'gbc', label: 'Game Boy Color', hint: 'settings.hintGb' },
  { id: 'nds', label: 'Nintendo DS', hint: 'settings.hintNds' },
  { id: '3ds', label: 'Nintendo 3DS', hint: 'Azahar' }
]
const hintOf = (hint: string): string => (hint.includes('.') ? t(hint as TKey) : hint)

/** One executable per platform (empty = default app), plus Wine */
const props = defineProps<{ settings: Settings }>()
const emit = defineEmits<{ save: [patch: Partial<Settings>] }>()

const setEmulator = (id: EmulatorPlatform, path: string): void =>
  emit('save', { emulators: { ...props.settings.emulators, [id]: { path } } })
const browse = async (id: EmulatorPlatform): Promise<void> => {
  const path = await window.offli.pickFile('executable')
  if (path) setEmulator(id, path)
}
</script>

<template>
  <SettingsGroup :title="t('settings.emulators')">
    <SettingsRow v-for="e in EMULATORS" :key="e.id" :label="e.label" :desc="hintOf(e.hint)" :html-for="`emu-${e.id}`">
      <input
        :id="`emu-${e.id}`"
        class="input settings-path-input"
        readonly
        :value="settings.emulators[e.id].path"
        :placeholder="t('settings.defaultApp')"
      />
      <button
        class="icon-btn"
        :aria-label="t('settings.browseFor', { name: e.label })"
        :data-tooltip="t('settings.browse')"
        @click="browse(e.id)"
      >
        <Icon name="folder" />
      </button>
      <button
        class="icon-btn"
        :aria-label="t('settings.useDefaultFor', { name: e.label })"
        :data-tooltip="t('settings.defaultApp')"
        :disabled="!settings.emulators[e.id].path"
        @click="setEmulator(e.id, '')"
      >
        <Icon name="close" :size="14" />
      </button>
    </SettingsRow>
  </SettingsGroup>
  <RunnerGroup :settings="settings" @save="emit('save', $event)" />
</template>
