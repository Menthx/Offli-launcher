<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { Game, GameStats } from '../../../../shared/types'
import logo from '../../assets/logo.png'
import Icon from '../../components/Icon.vue'
import UpdateButton from '../../components/UpdateButton.vue'
import { t } from '../../i18n'
import { FILTERS, type Filter, filterLabel, groupLabel, matches } from './filters'

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
