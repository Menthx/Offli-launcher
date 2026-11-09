<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import { vFocus } from '../../directives/focus'

/** Enter saves, Shift+Enter adds a line, Esc cancels (when allowed) */
const props = defineProps<{
  initial?: string
  label: string
  placeholder?: string
  autofocus?: boolean
  /** Without it, the field stays and empties after each save */
  cancellable?: boolean
}>()
const emit = defineEmits<{ save: [text: string]; cancel: [] }>()

const text = ref(props.initial ?? '')
const area = useTemplateRef('area')

/** Grows with its text, up to the CSS max-height */
const fit = (): void => {
  const el = area.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
onMounted(fit)

const onKey = (e: KeyboardEvent): void => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    if (!text.value.trim() && !props.cancellable) return
    emit('save', text.value.trim())
    if (!props.cancellable) text.value = ''
    requestAnimationFrame(fit)
  }
  if (e.key === 'Escape' && props.cancellable) {
    e.stopPropagation()
    emit('cancel')
  }
}
</script>

<template>
  <textarea
    ref="area"
    v-model="text"
    v-focus="autofocus"
    class="note-input"
    rows="1"
    :aria-label="label"
    :placeholder="placeholder"
    @input="fit"
    @keydown="onKey"
  />
</template>
