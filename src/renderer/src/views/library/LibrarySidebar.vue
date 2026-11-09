<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import type { Game, GameStats } from '../../../../shared/types'
import logo from '../../assets/logo.png'
import Icon from '../../components/Icon.vue'
import UpdateButton from '../../components/UpdateButton.vue'
import { t } from '../../i18n'
import { FILTERS, type Filter, filterLabel, groupLabel, matches, playerFilters } from './filters'

const props = defineProps<{ games: Game[]; stats: Record<string, GameStats>; filter: Filter }>()
const query = defineModel<string>('query', { required: true })
const emit = defineEmits<{
  filter: [f: Filter]
  searchKey: [e: KeyboardEvent]
  bigPicture: []
  openSettings: []
}>()

const search = useTemplateRef('search')
defineExpose({ search })

// Shown only once the player has used them; counted on visible games
const own = computed(() => {
  const { status, tags } = playerFilters(props.stats)
  return [
    { group: 'library.groupStatus' as const, ids: status.filter((f) => count(f) > 0) },
    { group: 'library.groupCollections' as const, ids: tags.filter((f) => count(f) > 0) }
  ].filter((g) => g.ids.length)
})
const count = (f: Filter): number => props.games.filter((g) => matches(f, g, props.stats[g.id])).length
</script>

<template>
  <aside class="lib-side">
    <span class="brand" @click="emit('filter', 'all')">
      <img class="brand-logo" :src="logo" alt="" aria-hidden="true" draggable="false" />
      Offli-Launcher
    </span>
    <label class="searchbar" data-tour="sidebar" :data-tooltip="t('library.searchTip')">
      <Icon name="search" />
      <input
        id="lib-search"
        ref="search"
        v-model="query"
        type="search"
        :aria-label="t('library.searchLabel')"
        :placeholder="t('library.searchPlaceholder')"
        @keydown="emit('searchKey', $event)"
      />
      <kbd aria-hidden="true">Ctrl K</kbd>
    </label>
    <nav class="side-filters" :aria-label="t('library.filtersLabel')" data-tour="sidebar">
      <div v-for="f in FILTERS" :key="f.id" class="side-item">
        <h4 v-if="f.group">{{ groupLabel(f.group) }}</h4>
        <button :class="{ on: filter === f.id }" :aria-pressed="filter === f.id" @click="emit('filter', f.id)">
          <span>{{ filterLabel(f.id) }}</span>
          <span class="count">{{ count(f.id) }}</span>
        </button>
      </div>
      <template v-for="g in own" :key="g.group">
        <div v-for="(id, i) in g.ids" :key="id" class="side-item">
          <h4 v-if="i === 0">{{ groupLabel(g.group) }}</h4>
          <button :class="{ on: filter === id }" :aria-pressed="filter === id" @click="emit('filter', id)">
            <span>{{ filterLabel(id) }}</span>
            <span class="count">{{ count(id) }}</span>
          </button>
        </div>
      </template>
    </nav>
    <div class="side-foot">
      <button
        class="icon-square"
        :aria-label="`${t('common.bigPicture')} (F11)`"
        :data-tooltip="`${t('common.bigPicture')}|F11`"
        @click="emit('bigPicture')"
      >
        <Icon name="monitor" :size="20" />
      </button>
      <UpdateButton />
      <button
        class="settings-btn"
        data-tour="settings"
        :aria-label="t('common.settings')"
        :data-tooltip="t('common.settings')"
        @click="emit('openSettings')"
      >
        <Icon name="settings" :size="20" />
      </button>
    </div>
  </aside>
</template>
