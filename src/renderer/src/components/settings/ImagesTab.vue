<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Settings } from '../../../../shared/types'
import { t } from '../../i18n'
import SettingsGroup from './SettingsGroup.vue'
import SettingsRow from './SettingsRow.vue'
import SettingsSwitch from './SettingsSwitch.vue'

const props = defineProps<{ settings: Settings }>()
const emit = defineEmits<{ save: [patch: Partial<Settings>] }>()
const key = ref('')

const baseCovers = computed({
  get: () => props.settings.useBaseRomCovers,
  set: (on: boolean) => emit('save', { useBaseRomCovers: on })
})
const useSgdb = computed({
  get: () => props.settings.useSteamGridDb,
  set: (on: boolean) => emit('save', { useSteamGridDb: on })
})

// The saved key never reaches the renderer: this field only replaces it
const saveKey = (): void => {
  if (!key.value.trim()) return
  emit('save', { steamGridDbKey: key.value.trim() })
  key.value = ''
}
</script>

<template>
  <SettingsGroup :title="t('settings.covers')">
    <SettingsSwitch id="set-base" v-model="baseCovers" :desc="t('settings.baseCoversDesc')">
      {{ t('settings.baseCovers') }}
    </SettingsSwitch>
    <SettingsSwitch id="set-sgdb" v-model="useSgdb">{{ t('settings.sgdbUse') }}</SettingsSwitch>
    <SettingsRow v-if="settings.useSteamGridDb" :label="t('settings.sgdbKey')" html-for="set-sgdb-key" stacked>
      <div class="field-row">
        <input
          id="set-sgdb-key"
          v-model="key"
          class="input"
          type="password"
          :placeholder="settings.hasSteamGridDbKey ? t('settings.sgdbKeySaved') : t('settings.sgdbKeyHint')"
          @blur="saveKey"
        />
        <button v-if="settings.hasSteamGridDbKey" class="ghost danger" @click="emit('save', { steamGridDbKey: '' })">
          {{ t('settings.sgdbKeyDelete') }}
        </button>
      </div>
    </SettingsRow>
  </SettingsGroup>
</template>
