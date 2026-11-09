<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useTemplateRef } from 'vue'
import type { UpdateStatus } from '../../../shared/types'
import { t } from '../i18n'
import { updateView } from '../updateUi'

/** Check, download and open the GitHub page on click; installing always asks first */
const status = shallowRef<UpdateStatus>({ state: 'idle' })
const version = ref('')
const confirming = ref(false)
const restart = useTemplateRef('restart')
const button = useTemplateRef('button')

void window.offli.updateState().then((s) => {
  status.value = s.status
  version.value = s.version
})
const off = window.offli.onUpdateStatus((s) => (status.value = s))
onBeforeUnmount(off)

const view = computed(() => updateView(status.value, version.value))
const target = computed(() => (status.value.state === 'downloaded' ? status.value.version : ''))

const onClick = async (): Promise<void> => {
  switch (view.value.action) {
    case 'check':
      void window.offli.updateCheck()
      break
    case 'download':
      void window.offli.updateDownload()
      break
    case 'open-page':
      void window.offli.updateOpenPage()
      break
    case 'confirm-install':
      confirming.value = true
      await nextTick()
      restart.value?.focus()
      break
  }
}

const closeConfirm = (): void => {
  confirming.value = false
  button.value?.focus()
}

const install = (): void => void window.offli.updateInstall()

// Download progress ring
const r = 15
const circ = 2 * Math.PI * r
</script>

<template>
  <div class="update-wrap">
    <button
      ref="button"
      class="icon-square update-btn"
      :disabled="view.disabled"
      :aria-label="view.label"
      :aria-busy="view.busy"
      :data-tooltip="view.tooltip"
      @click="onClick"
    >
      <span v-if="view.busy && view.percent === undefined" class="spinner" aria-hidden="true" />
      <svg
        v-else
        width="20"
        height="20"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 3v12M7 10l5 5 5-5M4 19h16" />
      </svg>
      <svg v-if="view.percent !== undefined" class="update-ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle
          cx="18"
          cy="18"
          :r="r"
          fill="none"
          stroke-width="2.5"
          :stroke-dasharray="circ"
          :stroke-dashoffset="circ * (1 - view.percent / 100)"
        />
      </svg>
      <span v-if="view.badge" :class="['update-badge', view.badge]" aria-hidden="true" />
    </button>
    <span v-if="view.message" class="update-message">{{ view.message }}</span>
    <!-- Announces state changes to screen readers -->
    <span class="visually-hidden" aria-live="polite">{{ status.state === 'idle' ? '' : view.label }}</span>
    <div
      v-if="confirming"
      class="update-confirm"
      role="dialog"
      aria-modal="false"
      aria-labelledby="update-confirm-title"
      @keydown.esc="closeConfirm"
    >
      <p id="update-confirm-title">{{ t('update.confirm', { version: target }) }}</p>
      <div class="row-actions">
        <button class="ghost" @click="closeConfirm">{{ t('update.later') }}</button>
        <button ref="restart" class="cta" @click="install">{{ t('update.restart') }}</button>
      </div>
    </div>
  </div>
</template>
