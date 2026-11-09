<script setup lang="ts">
import { ref } from 'vue'
import type { JournalNote } from '../../../../shared/types'
import Icon from '../../components/Icon.vue'
import { noteDate } from '../../format'
import { t } from '../../i18n'
import NoteInput from './NoteInput.vue'

defineProps<{ note: JournalNote }>()
const emit = defineEmits<{ change: [text: string]; delete: [] }>()

const editing = ref(false)
const confirm = ref(false)

const saveEdit = (text: string): void => {
  editing.value = false
  if (text) emit('change', text)
  else emit('delete')
}
</script>

<template>
  <li v-if="editing" class="note is-editing">
    <NoteInput
      :initial="note.text"
      :label="t('journal.edit')"
      autofocus
      cancellable
      @save="saveEdit"
      @cancel="editing = false"
    />
    <small>{{ t('journal.editHint') }}</small>
  </li>
  <li v-else class="note" @mouseleave="confirm = false">
    <small>{{ noteDate(note.at) }}</small>
    <p>{{ note.text }}</p>
    <div class="note-tools">
      <button class="icon-btn" :aria-label="t('journal.edit')" @click="editing = true">
        <Icon name="pencil" :size="14" />
      </button>
      <button
        :class="['icon-btn', { 'is-confirm': confirm }]"
        :aria-label="t('journal.delete')"
        @click="confirm ? emit('delete') : (confirm = true)"
      >
        <Icon name="trash" :size="14" />
        <span v-if="confirm">{{ t('journal.confirmDelete') }}</span>
      </button>
    </div>
  </li>
</template>
