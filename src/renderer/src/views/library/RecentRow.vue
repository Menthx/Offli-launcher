<script setup lang="ts">
import type { Game } from '../../../../shared/types'
import GameCover from '../../components/GameCover.vue'
import { t } from '../../i18n'
import { type CardHandlers, cardActions } from './cards'

/** Covers only, no titles */
defineProps<{ games: Game[]; handlers: CardHandlers }>()
</script>

<template>
  <section class="stack-s">
    <h5>{{ t('library.recent') }}</h5>
    <div class="recent">
      <button
        v-for="g in games"
        :key="g.id"
        :class="['card', { sel: g.id === handlers.selectedId }]"
        :data-tooltip="g.name"
        v-on="cardActions(g, handlers)"
      >
        <GameCover :game="g" />
      </button>
    </div>
  </section>
</template>
