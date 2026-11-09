<script setup lang="ts">
import { computed } from 'vue'
import type { GameJournal, JournalNote as Note } from '../../../../shared/types'
import { t } from '../../i18n'
import JournalNote from './JournalNote.vue'
import NoteInput from './NoteInput.vue'

/** Player notes, newest first */
const props = defineProps<{ journal: GameJournal | undefined }>()
const emit = defineEmits<{ save: [next: GameJournal] }>()

const notes = computed(() => props.journal?.notes ?? [])
const update = (list: Note[]): void => {
  if (props.journal) emit('save', { ...props.journal, notes: list })
}
const add = (text: string): void => update([{ id: crypto.randomUUID(), at: Date.now(), text }, ...notes.value])
const change = (id: string, text: string): void => update(notes.value.map((x) => (x.id === id ? { ...x, text } : x)))
const remove = (id: string): void => update(notes.value.filter((x) => x.id !== id))
</script>

<template>
  <section class="gp-box journal" aria-labelledby="journal-title">
    <header class="gp-box__head">
      <h5 id="journal-title">{{ t('journal.title') }}</h5>
      <span v-if="notes.length > 0" class="muted">
        {{ notes.length === 1 ? t('journal.countOne') : t('journal.countMany', { n: notes.length }) }}
      </span>
    </header>
    <div class="note-compose">
      <NoteInput :label="t('journal.placeholder')" :placeholder="t('journal.placeholder')" @save="add" />
      <small :data-tooltip="t('journal.newlineHint')">{{ t('journal.enterHint') }}</small>
    </div>
    <p v-if="journal && notes.length === 0" class="muted journal-empty">{{ t('journal.empty') }}</p>
    <ul class="notes">
      <JournalNote v-for="n in notes" :key="n.id" :note="n" @change="change(n.id, $event)" @delete="remove(n.id)" />
    </ul>
  </section>
</template>
