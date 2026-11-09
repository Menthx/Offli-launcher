<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import { t } from '../../i18n'
import Icon from '../Icon.vue'
import SettingsGroup from './SettingsGroup.vue'
import SettingsRow from './SettingsRow.vue'

/** Puts every setting back to its default, after an inline confirmation */
const emit = defineEmits<{ reset: [] }>()
const confirming = ref(false)
const failed = ref(false)
const cancel = useTemplateRef('cancel')

// Focus lands on Cancel, so a stray Enter doesn't wipe everything
const ask = async (): Promise<void> => {
  confirming.value = true
  await nextTick()
  cancel.value?.focus()
}

const reset = async (): Promise<void> => {
  if (await window.offli.resetSettings()) emit('reset')
  else failed.value = true
  confirming.value = false
}
</script>

<template>
  <SettingsGroup :title="t('settings.reset')">
    <SettingsRow :label="t('settings.resetRow')" :desc="t('settings.resetDesc')">
      <button v-if="!confirming" class="ghost danger" @click="ask">
        <Icon name="reset" :size="14" />{{ t('settings.resetButton') }}
      </button>
    </SettingsRow>
    <div v-if="confirming" class="settings-row" role="alertdialog" aria-labelledby="reset-confirm">
      <p id="reset-confirm" class="settings-row__label">{{ t('settings.resetConfirm') }}</p>
      <div class="settings-row__control">
        <button ref="cancel" class="ghost" @click="confirming = false">{{ t('common.cancel') }}</button>
        <button class="ghost danger" @click="reset">{{ t('settings.resetConfirmButton') }}</button>
      </div>
    </div>
    <p v-if="failed" class="settings-note is-error" role="status">{{ t('settings.resetFailed') }}</p>
  </SettingsGroup>
</template>
