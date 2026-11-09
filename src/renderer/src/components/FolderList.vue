<script setup lang="ts">
import { addFolder, addFolderLabel, folderStatus, removeFolder } from '../folders'
import { t } from '../i18n'

/** Shared by the tutorial, settings and first-launch screen: one row per folder, a real folder picker and the scan status */
const props = defineProps<{
  paths: string[]
  games: { kind: string }[]
  scanning: boolean
}>()
/** The parent saves the new list, which triggers a rescan */
const emit = defineEmits<{ change: [paths: string[]] }>()

const add = async (): Promise<void> => {
  const next = addFolder(props.paths, await window.offli.pickFolder())
  if (next !== props.paths) emit('change', next)
}
</script>

<template>
  <div class="folder-picker">
    <ul v-if="paths.length > 0" class="folder-list" :aria-label="t('folders.listLabel')">
      <li v-for="dir in paths" :key="dir">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        >
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        <span class="folder-path" :data-tooltip="dir">{{ dir }}</span>
        <button
          class="icon-btn"
          :aria-label="t('folders.removeDir', { dir })"
          :data-tooltip="t('folders.remove')"
          @click="emit('change', removeFolder(paths, dir))"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </li>
    </ul>
    <button class="folder-add" @click="add">{{ addFolderLabel(paths) }}</button>
    <p class="folder-status" role="status">{{ folderStatus(paths, games, scanning) }}</p>
  </div>
</template>
