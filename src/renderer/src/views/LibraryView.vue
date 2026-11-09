<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useTemplateRef, watch } from 'vue'
import type { Game, LibrarySort } from '../../../shared/types'
import SgdbPicker from '../components/SgdbPicker.vue'
import { t } from '../i18n'
import { animate } from '../viewTransition'
import type { CardHandlers } from './library/cards'
import { type Filter, filterGames, firstShown, playerFilters, recentGames, sortGames } from './library/filters'
import GameDetail from './library/GameDetail.vue'
import LibraryGrid from './library/LibraryGrid.vue'
import LibrarySidebar from './library/LibrarySidebar.vue'
import { useLibraryKeys } from './library/useLibraryKeys'
import type { ViewEmits, ViewProps } from './viewProps'

/** Debounce so fast typing triggers a single animation */
const SEARCH_SETTLE_MS = 120

const p = defineProps<
  ViewProps & {
    scanning: boolean
    customCovers: Record<string, string>
    launchExe: Record<string, string>
    /** Lets the menu offer picking a cover */
    hasSgdbKey: boolean
  }
>()
const emit = defineEmits<
  ViewEmits & {
    openSettings: []
    bigPicture: []
    coverChanged: [id: string]
    rename: [game: Game, name: string | null]
    /** Hides the game everywhere (closes its page if open) */
    hide: [game: Game]
    exe: [versionId: string, path: string]
  }
>()

const filter = ref<Filter>('all')
const query = ref('')
// Query applied to the grid once typing settles
const appliedQuery = ref('')
const picked = ref<Record<string, string>>({})
const sgdbFor = shallowRef<Game>()
const sidebar = useTemplateRef('sidebar')

let settle = 0
watch([query, appliedQuery], ([q, applied]) => {
  window.clearTimeout(settle)
  if (q !== applied) settle = window.setTimeout(() => animate(() => (appliedQuery.value = q)), SEARCH_SETTLE_MS)
})

const visible = computed(() =>
  sortGames(filterGames(p.games, p.stats, filter.value, appliedQuery.value), p.stats, p.sort)
)
const recent = computed(() => recentGames(p.games, p.stats))
const allTags = computed(() => playerFilters(p.stats).tags.map((f) => f.slice(4)))
// Picked version (newest by default) is what Enter launches
const target = computed(
  () => p.selected && (p.selected.versions?.find((v) => v.id === picked.value[p.selected!.id]) ?? p.selected)
)
useLibraryKeys(
  () => sidebar.value?.search,
  () => {
    const game = target.value
    return game && !p.running[game.id] ? () => emit('launch', game) : undefined
  }
)

// Back from the game page lands where the grid was left
const main = useTemplateRef('main')
let gridScroll = 0
// From the game page, the logo, a filter or the search show the grid again, from the top
const backToGrid = (update: () => void): void => {
  update()
  if (!p.selected) return
  gridScroll = 0
  emit('select', undefined)
}
const changeFilter = (f: Filter): void =>
  p.selected ? backToGrid(() => (filter.value = f)) : animate(() => (filter.value = f))
const changeQuery = (q: string): void => backToGrid(() => (query.value = q))
watch(
  () => p.selected?.id,
  async (id) => {
    await nextTick()
    if (main.value) main.value.scrollTop = id ? 0 : gridScroll
  }
)
const onScroll = (): void => {
  if (!p.selected && main.value) gridScroll = main.value.scrollTop
}

const handlers = computed<CardHandlers>(() => ({
  selectedId: p.selected?.id,
  select: (id) => emit('select', id),
  launch: (game) => emit('launch', game)
}))

const onSearchKey = (e: KeyboardEvent): void => {
  // Enter right after typing: launch the first match without waiting
  if (e.key === 'Enter' && query.value !== appliedQuery.value) {
    const hit = sortGames(filterGames(p.games, p.stats, filter.value, query.value), p.stats, p.sort)[0]
    appliedQuery.value = query.value
    if (hit) emit('launch', hit)
    return
  }
  const first = firstShown(visible.value, p.stats, filter.value)
  if (e.key === 'Enter' && first) emit('launch', first)
  if (e.key === 'Escape') query.value = ''
}

const sort = computed({
  get: () => p.sort,
  set: (s: LibrarySort) => animate(() => emit('sort', s))
})
const emptyText = computed(() =>
  p.games.length > 0 ? t('library.emptyNoMatch') : p.scanning ? t('library.emptyScanning') : t('library.emptyNone')
)
</script>

<template>
  <div class="lib">
    <LibrarySidebar
      ref="sidebar"
      :games="games"
      :stats="stats"
      :filter="filter"
      :query="query"
      @update:query="changeQuery"
      @filter="changeFilter"
      @search-key="onSearchKey"
      @big-picture="emit('bigPicture')"
      @open-settings="emit('openSettings')"
    />

    <main ref="main" class="lib-main" @scroll="onScroll">
      <GameDetail
        v-if="selected"
        :game="selected"
        :stats="stats[selected.id]"
        :has-custom-cover="!!customCovers[selected.id]"
        :has-sgdb-key="hasSgdbKey"
        :picked="picked"
        :running-since="running"
        :all-tags="allTags"
        :launch-exe="launchExe"
        @exe="(id, path) => emit('exe', id, path)"
        @pick="(gameId, versionId) => (picked = { ...picked, [gameId]: versionId })"
        @close="emit('select', undefined)"
        @launch="emit('launch', $event)"
        @favorite="emit('favorite', $event)"
        @rename="(game, name) => emit('rename', game, name)"
        @cover-changed="emit('coverChanged', $event)"
        @pick-sgdb="sgdbFor = $event"
        @hide="emit('hide', $event)"
      />
      <LibraryGrid
        v-else
        v-model:sort="sort"
        :visible="visible"
        :recent="!query && filter === 'all' ? recent : []"
        :filter="filter"
        :stats="stats"
        :handlers="handlers"
        :empty-text="emptyText"
        @filter="changeFilter"
      />
    </main>

    <SgdbPicker
      v-if="sgdbFor"
      :game="sgdbFor"
      @close="sgdbFor = undefined"
      @picked="emit('coverChanged', sgdbFor!.id)"
    />
  </div>
</template>
