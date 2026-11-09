<script setup lang="ts">
import { computed } from 'vue'
import type { Settings, StartView } from '../../../../shared/types'
import { LANGUAGES, type LanguagePref, t } from '../../i18n'
import { THEMES, themeLabel } from '../../theme'
import AppSelect from '../AppSelect.vue'
import SettingsGroup from './SettingsGroup.vue'
import SettingsRow from './SettingsRow.vue'
import SettingsSwitch from './SettingsSwitch.vue'

const props = defineProps<{ settings: Settings }>()
const emit = defineEmits<{ save: [patch: Partial<Settings>]; replayTour: [] }>()

const startViews = computed<[StartView, string][]>(() => [
  ['library', t('common.library')],
  ['bigpicture', t('common.bigPicture')]
])
const languageOptions = computed(() => [
  { value: 'auto' as LanguagePref, label: t('settings.languageAuto') },
  ...LANGUAGES.map((l) => ({ value: l.id as LanguagePref, label: l.label, lang: l.id }))
])
const language = computed({
  get: () => props.settings.language,
  set: (language: LanguagePref) => emit('save', { language })
})
const bpFullscreen = computed({
  get: () => props.settings.bigPictureFullscreen,
  set: (on: boolean) => emit('save', { bigPictureFullscreen: on })
})
const minimize = computed({
  get: () => props.settings.minimizeOnLaunch,
  set: (on: boolean) => emit('save', { minimizeOnLaunch: on })
})

// Arrows toggle the two options and move focus (radio group)
const onStartKey = (e: KeyboardEvent, v: StartView): void => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
  e.preventDefault()
  e.stopPropagation()
  const other: StartView = v === 'library' ? 'bigpicture' : 'library'
  emit('save', { startView: other })
  const group = (e.currentTarget as HTMLElement).parentElement
  group?.querySelector<HTMLElement>(`[data-v="${other}"]`)?.focus()
}
</script>

<template>
  <SettingsGroup>
    <SettingsRow :label="t('settings.language')" html-for="set-language">
      <AppSelect id="set-language" v-model="language" class="settings-select" :options="languageOptions" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup id="theme-label" :title="t('settings.theme')">
    <div class="theme-cards" role="group" aria-labelledby="theme-label">
      <button
        v-for="th in THEMES"
        :key="th.id"
        :class="['theme-card', { on: settings.theme === th.id }]"
        :aria-pressed="settings.theme === th.id"
        @click="emit('save', { theme: th.id })"
      >
        <span class="swatches" aria-hidden="true">
          <span v-for="c in th.swatches" :key="c" class="swatch" :style="{ background: c }" />
        </span>
        {{ themeLabel(th.id) }}
      </button>
    </div>
  </SettingsGroup>

  <SettingsGroup :title="t('settings.startup')">
    <SettingsRow :label="t('settings.openAtStart')" label-id="start-label">
      <div class="seg" role="radiogroup" aria-labelledby="start-label">
        <button
          v-for="[v, label] in startViews"
          :key="v"
          role="radio"
          :aria-checked="settings.startView === v"
          :tabindex="settings.startView === v ? 0 : -1"
          :data-v="v"
          @click="emit('save', { startView: v })"
          @keydown="onStartKey($event, v)"
        >
          {{ label }}
        </button>
      </div>
    </SettingsRow>
    <SettingsSwitch id="set-bp-fullscreen" v-model="bpFullscreen" :desc="t('settings.bpFullscreenDesc')">
      {{ t('settings.bpFullscreen') }}
    </SettingsSwitch>
    <SettingsSwitch id="set-minimize" v-model="minimize" :desc="t('settings.minimizeOnLaunchDesc')">
      {{ t('settings.minimizeOnLaunch') }}
    </SettingsSwitch>
  </SettingsGroup>

  <SettingsGroup :title="t('settings.help')">
    <SettingsRow :label="t('settings.tour')" :desc="t('settings.tourDesc')">
      <button class="ghost" @click="emit('replayTour')">{{ t('settings.replayTour') }}</button>
    </SettingsRow>
  </SettingsGroup>
</template>
