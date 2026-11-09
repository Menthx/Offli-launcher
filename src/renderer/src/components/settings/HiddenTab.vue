<script setup lang="ts">
import { computed } from 'vue'
import type { Game, Settings } from '../../../../shared/types'
import { PLATFORM_LABEL, kindLabel } from '../../format'
import { hiddenGamesOf, showGame } from '../../hiddenGames'
import { t } from '../../i18n'
import GameCover from '../GameCover.vue'
import SettingsGroup from './SettingsGroup.vue'

const props = defineProps<{ settings: Settings; games: Game[] }>()
const emit = defineEmits<{ save: [patch: Partial<Settings>] }>()
const hidden = computed(() => hiddenGamesOf(props.games, props.settings.hiddenGames))
</script>

<template>
  <div v-if="hidden.length === 0" class="empty">
    <h4>{{ t('settings.hiddenEmpty') }}</h4>
    <p>{{ t('settings.hiddenEmptyDesc') }}</p>
  </div>
  <SettingsGroup v-else :title="t('settings.hiddenCount', { n: hidden.length })">
    <ul class="hidden-list" :aria-label="t('settings.tabHidden')">
      <li v-for="g in hidden" :key="g.id" class="settings-row">
        <span class="hidden-thumb"><GameCover :game="g" /></span>
        <span class="hidden-info">
          <span class="hidden-name">{{ g.name }}</span>
          <span class="muted">{{ kindLabel(g) }} · {{ PLATFORM_LABEL[g.platform] }}</span>
        </span>
        <button
          class="ghost"
          :aria-label="t('settings.showGame', { name: g.name })"
          @click="emit('save', { hiddenGames: showGame(settings.hiddenGames, g.id) })"
        >
          {{ t('common.show') }}
        </button>
      </li>
    </ul>
  </SettingsGroup>
</template>
