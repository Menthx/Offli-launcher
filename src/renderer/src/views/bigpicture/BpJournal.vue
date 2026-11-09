<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { linkKind } from '../../../../shared/links'
import Icon from '../../components/Icon.vue'
import { noteDate } from '../../format'
import { t } from '../../i18n'
import { ICONS, linkRows, shortUrl } from '../library/communityLinks'
import { useJournal } from '../library/useJournal'

/** Big Picture: notes and community links of the current game, read with the gamepad (Up / Down, A opens a link) */
const props = defineProps<{ gameId: string; name: string }>()
const emit = defineEmits<{ close: [] }>()

const { journal, detected } = useJournal(() => props.gameId)
const links = computed(() => linkRows(journal.value, detected.value))
const notes = computed(() => [...(journal.value?.notes ?? [])].sort((a, b) => b.at - a.at))
const count = computed(() => links.value.length + notes.value.length)
const cursor = ref(0)
const list = useTemplateRef<HTMLElement>('list')

watch(cursor, async (i) => {
  await nextTick()
  list.value?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
})

const open = (i: number): void => {
  cursor.value = i
  const row = links.value[i]
  if (row) void window.offli.openLink(row.url)
}

defineExpose({
  move: (d: number): void => {
    cursor.value = Math.max(0, Math.min(count.value - 1, cursor.value + d))
  },
  /** A: opens the link under the cursor */
  activate: (): void => open(cursor.value)
})
</script>

<template>
  <div class="bp-journal" role="dialog" :aria-label="`${t('bp.journal')} · ${name}`">
    <header>
      <h3>{{ t('bp.journal') }} · {{ name }}</h3>
      <button class="ghost bp-glass" @click="emit('close')">{{ t('bp.close') }}</button>
    </header>
    <ul ref="list" class="bp-journal__list">
      <li v-if="links.length" class="bp-journal__group">{{ t('bp.links') }}</li>
      <li v-for="(row, i) in links" :key="row.url" :data-i="i" :class="['bp-journal__link', { cur: cursor === i }]">
        <button tabindex="-1" @click="open(i)">
          <Icon :name="ICONS[row.icon]" :size="18" />
          <span>{{ row.name ?? t(`journal.${linkKind(row.url)}`) }}</span>
          <small>{{ shortUrl(row.url) }}</small>
        </button>
      </li>
      <li v-if="notes.length" class="bp-journal__group">{{ t('journal.title') }}</li>
      <li
        v-for="(n, i) in notes"
        :key="n.id"
        :data-i="links.length + i"
        :class="['bp-journal__note', { cur: cursor === links.length + i }]"
      >
        <time>{{ noteDate(n.at) }}</time>
        <p>{{ n.text }}</p>
      </li>
      <li v-if="!notes.length" class="bp-journal__empty">{{ t('bp.journalEmpty') }}</li>
    </ul>
    <footer class="bp-foot">
      <span v-if="links.length"><span class="pad a">A</span>{{ t('bp.links') }}</span>
      <span><span class="pad b">B</span>{{ t('bp.close') }}</span>
      <span class="bp-keys"
        ><kbd>↑</kbd> <kbd>↓</kbd> <kbd>J</kbd> <kbd>{{ t('common.keyEsc') }}</kbd></span
      >
    </footer>
  </div>
</template>
