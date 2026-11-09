<script setup lang="ts">
import { ref } from 'vue'
import { normalizeUrl } from '../../../../shared/links'
import { vFocus } from '../../directives/focus'
import { t } from '../../i18n'

/** Address and optional name; adds a link, or edits one when given its current values */
const props = defineProps<{ initial?: { url: string; label: string } }>()
const emit = defineEmits<{ submit: [url: string, label: string]; close: [] }>()

const url = ref(props.initial?.url ?? '')
const label = ref(props.initial?.label ?? '')
const invalid = ref(false)

const submit = (): void => {
  const clean = normalizeUrl(url.value)
  if (!clean) {
    invalid.value = true
    return
  }
  emit('submit', clean, label.value.trim())
}
</script>

<template>
  <form class="link-form" @submit.prevent="submit" @keydown.esc.stop="emit('close')">
    <input
      v-model="url"
      v-focus
      class="input"
      placeholder="discord.gg/…"
      :aria-label="t('journal.linkUrl')"
      :aria-invalid="invalid"
      @input="invalid = false"
    />
    <input v-model="label" class="input" :placeholder="t('journal.linkLabel')" :aria-label="t('journal.linkLabel')" />
    <p v-if="invalid" class="link-error" role="alert">{{ t('journal.linkInvalid') }}</p>
    <div class="link-form__actions">
      <button type="button" class="ghost" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button type="submit" class="cta">{{ initial ? t('journal.saveLink') : t('journal.add') }}</button>
    </div>
  </form>
</template>
