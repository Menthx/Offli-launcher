<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Game, Settings } from '../../../../shared/types'
import { withoutHidden } from '../../hiddenGames'
import { t } from '../../i18n'
import { withMinDuration } from '../../minDuration'
import FolderList from '../FolderList.vue'
import BackupGroup from './BackupGroup.vue'
import ResetGroup from './ResetGroup.vue'
import SettingsGroup from './SettingsGroup.vue'
import SettingsRow from './SettingsRow.vue'

/** Minimum 'Scanning…' time so a fast scan stays visible */
const SCAN_FEEDBACK_MS = 2000

const props = defineProps<{
  settings: Settings
  games: Game[]
  scanning: boolean
  /** Awaited, to keep the button busy until the scan ends */
  scan: () => unknown
}>()
const emit = defineEmits<{ save: [patch: Partial<Settings>]; imported: []; reset: [] }>()

const dev = import.meta.env.DEV
const scanBusy = ref(false)
const busy = computed(() => scanBusy.value || props.scanning)
const shown = computed(() => withoutHidden(props.games, props.settings.hiddenGames))
const startScan = async (): Promise<void> => {
  scanBusy.value = true
  await withMinDuration(props.scan, SCAN_FEEDBACK_MS)
  scanBusy.value = false
}
</script>

<template>
  <SettingsGroup :title="t('settings.folders')">
    <SettingsRow :label="t('settings.foldersRow')" stacked>
      <FolderList
        :paths="settings.libraryPaths"
        :games="shown"
        :scanning="busy"
        @change="emit('save', { libraryPaths: $event })"
      />
    </SettingsRow>
  </SettingsGroup>
  <SettingsGroup>
    <SettingsRow :label="t('settings.rescan')" :desc="t('settings.rescanDesc')">
      <button
        class="ghost scan-btn"
        :disabled="busy || !settings.libraryPaths.length"
        :aria-busy="busy"
        :data-tooltip="settings.libraryPaths.join('\n')"
        @click="startScan"
      >
        <span v-if="busy" class="spinner" aria-hidden="true" />
        {{ busy ? t('settings.scanBusy') : t('settings.scan') }}
      </button>
    </SettingsRow>
  </SettingsGroup>
  <BackupGroup @imported="emit('imported')" />
  <ResetGroup v-if="dev" @reset="emit('reset')" />
</template>
