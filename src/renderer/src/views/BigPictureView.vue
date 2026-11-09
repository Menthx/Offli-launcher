<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import type { Game, GameStats } from '../../../shared/types'
import GameCover from '../components/GameCover.vue'
import Icon from '../components/Icon.vue'
import { useCover } from '../composables/useCover'
import { useNow } from '../composables/useNow'
import { vFocus } from '../directives/focus'
import { PLATFORM_LABEL, baseGameName, kindLabel, lastPlayed, playtime } from '../format'
import { t } from '../i18n'
import BpBackdrop from './bigpicture/BpBackdrop.vue'
import BpJournal from './bigpicture/BpJournal.vue'
import BpTabs from './bigpicture/BpTabs.vue'
import type { BpSection } from './bigpicture/sections'
import { useBigPictureInput } from './bigpicture/useBigPictureInput'
import { SECTIONS, SORTS, type Filter, matches, sortGames } from './library/filters'
import type { ViewEmits, ViewProps } from './viewProps'

/** Keyboard / gamepad view: the current game stays in place, the rail slides under it */
const p = defineProps<ViewProps>()
/** exit: Esc or B */
const emit = defineEmits<ViewEmits & { exit: [] }>()

const section = ref<Filter>('all')
// Non-empty sections; base ROMs are not library games
const sections = computed<BpSection[]>(() =>
  [
    { filter: 'all' as Filter, label: t('library.all') },
    ...SECTIONS.map((s) => ({ filter: s.filter, label: s.label() }))
  ]
    .map((s) => ({ ...s, count: p.games.filter((g) => matches(s.filter, g, p.stats[g.id])).length }))
    .filter((s) => s.count > 0)
)
// Order is frozen while browsing (launching changes stats): read without tracking, recomputed on list, section or sort change
let statsNow: Record<string, GameStats> = p.stats
watch(
  () => p.stats,
  (s) => (statsNow = s),
  { flush: 'sync' }
)
const order = computed(() =>
  sortGames(
    p.games.filter((g) => matches(section.value, g, statsNow[g.id])),
    statsNow,
    p.sort
  )
)
const rawIdx = ref(0)
const idx = computed(() => Math.min(rawIdx.value, Math.max(0, order.value.length - 1)))
const cur = computed(() => order.value[idx.value])
const url = useCover(() => cur.value?.id ?? '')
// Picked version by game (newest first in versions), Up / Down
const picked = ref<Record<string, number>>({})
const target = computed<Game | undefined>(() => cur.value?.versions?.[picked.value[cur.value.id] ?? 0] ?? cur.value)
const versionLabel = computed(() => {
  const v = cur.value?.versions
  const i = cur.value ? (picked.value[cur.value.id] ?? 0) : 0
  return v ? (v[i]?.variant ?? v[i]?.name ?? '') + (i === 0 ? t('detail.latest') : '') : ''
})
const since = computed(() => (target.value ? p.running[target.value.id] : undefined))
const journalOpen = ref(false)
const journal = useTemplateRef('journal')
const now = useNow(() => since.value !== undefined)
const st = computed(() => (cur.value ? p.stats[cur.value.id] : undefined))
const fav = computed(() => !!st.value?.favorite)

const pickSection = (f: Filter): void => {
  section.value = f
  rawIdx.value = 0
}
useBigPictureInput({
  vertical: (d) => {
    if (journalOpen.value) return journal.value?.move(d)
    const g = cur.value
    if (!g?.versions) return
    picked.value = {
      ...picked.value,
      [g.id]: Math.max(0, Math.min(g.versions.length - 1, (picked.value[g.id] ?? 0) + d))
    }
  },
  journal: () => (journalOpen.value = !journalOpen.value && !!cur.value),
  move: (d) => journalOpen.value || (rawIdx.value = Math.max(0, Math.min(order.value.length - 1, idx.value + d))),
  section: (d) => {
    if (journalOpen.value) return
    const list = sections.value
    const i = list.findIndex((s) => s.filter === section.value)
    const next = list[(i + d + list.length) % list.length]
    if (next) pickSection(next.filter)
  },
  sort: () => emit('sort', SORTS[(SORTS.findIndex((s) => s.id === p.sort) + 1) % SORTS.length]!.id),
  launch: () =>
    journalOpen.value
      ? journal.value?.activate()
      : target.value && since.value === undefined && emit('launch', target.value),
  favorite: () => cur.value && emit('favorite', cur.value),
  exit: () => (journalOpen.value ? (journalOpen.value = false) : emit('exit'))
})

const sortLabel = computed(() => t(SORTS.find((x) => x.id === p.sort)!.label))
const playLabel = computed(() =>
  since.value !== undefined
    ? t('common.running', { time: playtime(Math.round((now.value - since.value) / 1000)) })
    : t('common.play')
)
const onTile = (i: number): void => {
  if (i === idx.value && target.value) emit('launch', target.value)
  else rawIdx.value = i
}
</script>

<template>
  <div v-if="!cur" class="bp bp--empty">
    <div class="empty">
      <h4>{{ t('bp.empty') }}</h4>
      <p>{{ t('bp.emptyHint') }}</p>
      <button v-focus class="ghost" @click="emit('exit')">{{ t('bp.backToLibrary') }}</button>
    </div>
  </div>
  <div v-else class="bp">
    <BpBackdrop :id="cur.id" :url="url" />

    <header class="bp-top">
      <button class="ghost bp-glass" @click="emit('exit')">{{ t('bp.back') }}</button>
      <BpTabs :sections="sections" :current="section" @pick="pickSection" />
      <span class="bp-count" aria-hidden="true">{{ sortLabel }} · {{ idx + 1 }} / {{ order.length }}</span>
    </header>

    <section :key="cur.id" class="bp-hero" aria-live="polite">
      <p class="bp-eyebrow">
        <span :class="['badge', cur.kind === 'fangame' ? 'fan' : 'rom']">{{ PLATFORM_LABEL[cur.platform] }}</span>
        <span>{{ kindLabel(cur) }}</span>
        <span v-if="cur.baseRom">{{ t('bp.baseOf', { name: baseGameName(cur.baseRom) }) }}</span>
        <span v-if="cur.versions">{{ t('bp.versions', { n: cur.versions.length }) }}</span>
      </p>
      <h2>{{ cur.name }}</h2>
      <p v-if="cur.versions" class="bp-version">
        {{ t('bp.version', { name: versionLabel }) }} <kbd aria-hidden="true">↑</kbd> <kbd aria-hidden="true">↓</kbd>
      </p>
      <p class="bp-meta">
        {{ t('bp.meta', { time: playtime(st?.playtimeSec ?? 0), last: lastPlayed(st?.lastPlayed) }) }}
      </p>
      <div class="bp-actions">
        <button class="play bp-play" :disabled="since !== undefined" @click="target && emit('launch', target)">
          <span class="play-icon">
            <span v-if="since !== undefined" class="run-dot" aria-hidden="true" />
            <Icon v-else name="play" :size="18" />
          </span>
          <span class="play-label">{{ playLabel }}</span>
        </button>
        <button
          :class="['bp-glass', 'bp-fav', { on: fav }]"
          :aria-pressed="fav"
          :aria-label="fav ? t('common.favRemove') : t('common.favAdd')"
          @click="emit('favorite', cur)"
        >
          <Icon name="star" :size="20" />
        </button>
      </div>
    </section>

    <div class="bp-rail" role="listbox" :aria-label="t('bp.games')" :aria-activedescendant="`bp-${cur.id}`">
      <div class="bp-track" :style="{ '--bp-index': idx }">
        <button
          v-for="(g, i) in order"
          :id="`bp-${g.id}`"
          :key="g.id"
          role="option"
          :aria-selected="i === idx"
          :aria-label="g.name"
          :class="['tile', { cur: i === idx, past: i < idx }]"
          tabindex="-1"
          @click="onTile(i)"
        >
          <GameCover :game="g" />
        </button>
      </div>
    </div>

    <footer class="bp-foot">
      <span><span class="pad a">A</span>{{ t('common.play') }}</span>
      <span><span class="pad x">X</span>{{ t('bp.favorite') }}</span>
      <span><span class="pad y">Y</span>{{ t('bp.sortHint') }}</span>
      <span><span class="pad menu">≡</span>{{ t('bp.journal') }}</span>
      <span><span class="pad b">B</span>{{ t('common.library') }}</span>
      <span class="bp-keys">
        <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>J</kbd> <kbd>Q</kbd> <kbd>E</kbd> <kbd>S</kbd>
        <kbd>{{ t('common.keyEnter') }}</kbd> <kbd>F</kbd> <kbd>{{ t('common.keyEsc') }}</kbd>
      </span>
    </footer>
    <BpJournal v-if="journalOpen" ref="journal" :game-id="cur.id" :name="cur.name" @close="journalOpen = false" />
  </div>
</template>
