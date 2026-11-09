<script setup lang="ts">
import type { Game, GameStats } from '../../../../shared/types'
import GameCover from '../../components/GameCover.vue'
import { kindLabel, playtime } from '../../format'
import { type CardHandlers, cardActions } from './cards'

defineProps<{
  games: Game[]
  /** Transition name prefix: a game can appear in two sections */
  section: string
  animated: boolean
  stats: Record<string, GameStats>
  handlers: CardHandlers
}>()
</script>

<template>
  <div class="grid">
    <button
      v-for="(g, i) in games"
      :key="g.id"
      :class="['card', { sel: g.id === handlers.selectedId }]"
      :data-game="g.id"
      :data-tour="i === 0 ? 'game-card' : undefined"
      :style="animated ? { viewTransitionName: `card-${section}-${g.id}` } : undefined"
      v-on="cardActions(g, handlers)"
    >
      <GameCover :game="g" />
      <span class="card-title">{{ g.name }}</span>
      <span class="card-meta">
        <span>{{ kindLabel(g) }}</span>
        <span>{{ playtime(stats[g.id]?.playtimeSec ?? 0) }}</span>
      </span>
    </button>
  </div>
</template>
