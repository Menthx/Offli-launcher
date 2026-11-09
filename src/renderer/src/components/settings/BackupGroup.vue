<script setup lang="ts">
import { ref } from 'vue'
import type { DataResult } from '../../../../shared/types'
import { t } from '../../i18n'
import Icon from '../Icon.vue'
import SettingsGroup from './SettingsGroup.vue'
import SettingsRow from './SettingsRow.vue'

const emit = defineEmits<{ imported: [] }>()
const message = ref<{ text: string; error: boolean }>()

const run = async (action: 'export' | 'import'): Promise<void> => {
  const r: DataResult | null = await (action === 'export' ? window.offli.exportData() : window.offli.importData())
  if (!r) return // cancelled
  if (r.ok) {
    message.value = { text: t(action === 'export' ? 'settings.exported' : 'settings.imported'), error: false }
    if (action === 'import') emit('imported')
  } else
    message.value = { text: t(r.error === 'invalid' ? 'settings.backupInvalid' : 'settings.backupIo'), error: true }
}
</script>

<template>
  <SettingsGroup :title="t('settings.backup')">
    <SettingsRow :label="t('settings.backupRow')" :desc="t('settings.backupDesc')">
      <button class="ghost" @click="run('export')">
        <Icon name="download" :size="14" />{{ t('settings.export') }}
      </button>
      <button class="ghost" @click="run('import')"><Icon name="upload" :size="14" />{{ t('settings.import') }}</button>
    </SettingsRow>
    <p v-if="message" :class="['settings-note', { 'is-error': message.error }]" role="status">{{ message.text }}</p>
  </SettingsGroup>
</template>
