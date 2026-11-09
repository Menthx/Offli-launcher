<script setup lang="ts">
import { computed } from 'vue'
import type { Game, GameStats, LibrarySort } from '../../../../shared/types'
import AppSelect from '../../components/AppSelect.vue'
import Icon from '../../components/Icon.vue'
import { t } from '../../i18n'
import { type CardHandlers, MAX_ANIMATED_CARDS } from './cards'
import { SECTIONS, SORTS, type Filter, filterLabel, matches } from './filters'
import GameGrid from './GameGrid.vue'
import RecentRow from './RecentRow.vue'

/** Sort bar, recently played row, then the cards: in sections for 'All games', one grid otherwise */
const props = defineProps<{
  /** Filtered and sorted */
  visible: Game[]
  /** Empty when the row is not shown */
  recent: Game[]
  filter: Filter
  stats: Record<string, GameStats>
  handlers: CardHandlers
  emptyText: string
}>()
const sort = defineModel<LibrarySort>('sort', { required: true })
const emit = defineEmits<{ filter: [f: Filter] }>()

const sections = computed(() =>
  SECTIONS.map((sec) => ({
    ...sec,
    games: props.visible.filter((g) => matches(sec.filter, g, props.stats[g.id]))
  })).filter((sec) => sec.games.length > 0)
)
const animated = computed(() => props.visible.length <= MAX_ANIMATED_CARDS)
const sortOptions = computed(() => SORTS.map((s) => ({ value: s.id, label: t(s.label) })))
</script>

<template>
  <div class="lib-toolbar">
    <label for="lib-sort" class="lib-toolbar__label">
      <Icon name="sort" :size="14" />
      {{ t('library.sort') }}
    </label>
    <AppSelect id="lib-sort" v-model="sort" class="select--sm lib-sort" :options="sortOptions" />
  </div>
  <RecentRow v-if="recent.length > 0" :games="recent" :handlers="handlers" />
  <section v-if="visible.length === 0" class="stack-s">
    <h5>{{ filterLabel(filter) }} · 0</h5>
    <p class="muted">{{ emptyText }}</p>
  </section>
  <template v-else-if="filter === 'all'">
    <section v-for="sec in sections" :key="sec.filter" class="stack-s">
      <h5>
        <button
          class="section-link"
          :data-tooltip="t('library.onlyThis', { label: sec.label() })"
          @click="emit('filter', sec.filter)"
        >
          {{ sec.label() }}
        </button>
        · {{ sec.games.length }}
      </h5>
      <GameGrid :games="sec.games" :section="sec.filter" :animated="animated" :stats="stats" :handlers="handlers" />
    </section>
  </template>
  <section v-else class="stack-s">
    <h5>{{ filterLabel(filter) }} · {{ visible.length }}</h5>
    <GameGrid :games="visible" :section="filter" :animated="animated" :stats="stats" :handlers="handlers" />
  </section>
</template>
