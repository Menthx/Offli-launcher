<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import type { Game, GameStats } from '../../../../shared/types'
import GameActions from '../../components/GameActions.vue'
import type { MenuAction } from '../../components/gameActions'
import Icon from '../../components/Icon.vue'
import { useNow } from '../../composables/useNow'
import { PLATFORM_LABEL, kindLabel, lastPlayed, playtime } from '../../format'
import { t } from '../../i18n'
import { steamGridDbAction } from '../../menuActions'
import CommunityLinks from './CommunityLinks.vue'
import GameFacts from './GameFacts.vue'
import GameHero from './GameHero.vue'
import GameProgress from './GameProgress.vue'
import JournalBox from './JournalBox.vue'
import NameEditor from './NameEditor.vue'
import { useJournal } from './useJournal'

/** Game page (like Steam): banner with the name, Play bar, then journal, links and facts; replaces the grid until Back or Esc */
const props = defineProps<{
  game: Game
  stats: GameStats | undefined
  hasCustomCover: boolean
  hasSgdbKey: boolean
  /** Picked version per game (newest by default) */
  picked: Record<string, string>
  /** Launch time of running games, by id */
  runningSince: Record<string, number>
  /** Executable picked per game id */
  launchExe: Record<string, string>
  /** Collections used by any game, suggested when adding one */
  allTags: string[]
}>()
const emit = defineEmits<{
  close: []
  launch: [game: Game]
  favorite: [game: Game]
  rename: [game: Game, name: string | null]
  coverChanged: [id: string]
  pickSgdb: [game: Game]
  hide: [game: Game]
  pick: [gameId: string, versionId: string]
  exe: [versionId: string, path: string]
}>()

const target = computed(() => props.game.versions?.find((v) => v.id === props.picked[props.game.id]) ?? props.game)
const since = computed(() => props.runningSince[target.value.id])

// Esc goes back to the library, unless a field, menu or dialog is open
const onKey = (e: KeyboardEvent): void => {
  const el = e.target instanceof HTMLElement ? e.target : null
  if (e.key === 'Escape' && !el?.closest("input, textarea, [role='menu'], [role='dialog'], [role='listbox']"))
    emit('close')
}
window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const now = useNow(() => since.value !== undefined)
const runningFor = computed(() =>
  since.value === undefined ? '' : playtime(Math.max(0, Math.round((now.value - since.value) / 1000)))
)
// Notes and links belong to the game, whatever version is picked
const { journal, detected, save } = useJournal(() => props.game.id)

const setCover = async (img: string | null): Promise<void> => {
  await window.offli.setCover(props.game.id, img)
  emit('coverChanged', props.game.id)
}
const actions = computed<MenuAction[]>(() => {
  const sel = props.game
  return [
    { label: t('detail.openFolder'), icon: 'folder', run: () => window.offli.openFolder(target.value.id) },
    { label: t('detail.shortcut'), icon: 'external', run: () => void window.offli.createShortcut(target.value.id) },
    {
      label: t('detail.changeImage'),
      icon: 'image',
      run: async () => {
        const img = await window.offli.pickFile('image')
        if (img) await setCover(img)
      }
    },
    steamGridDbAction(props.hasSgdbKey, 'grid' as const, () => emit('pickSgdb', sel)),
    ...(props.hasCustomCover
      ? [{ label: t('detail.resetImage'), icon: 'reset' as const, run: () => setCover(null) }]
      : []),
    { label: t('detail.hideGame'), icon: 'hide', run: () => emit('hide', sel), danger: true }
  ]
})
</script>

<template>
  <article class="game-page" :aria-label="t('detail.sheetOf', { name: game.name })">
    <GameHero :game="game" @back="emit('close')">
      <span class="gp-kind">{{ kindLabel(game) }} · {{ PLATFORM_LABEL[game.platform] }}</span>
      <NameEditor :game="game" @rename="(g, name) => emit('rename', g, name)" />
    </GameHero>
    <div class="gp-bar" data-tour="detail-actions">
      <button v-if="since !== undefined" class="gp-play is-running" disabled aria-live="polite">
        <span class="run-dot" aria-hidden="true" />
        {{ t('common.running', { time: runningFor }) }}
      </button>
      <button v-else class="gp-play" @click="emit('launch', target)">
        <Icon name="play" :size="18" />
        {{ t('common.play') }}
        <kbd aria-hidden="true">{{ t('common.keyEnter') }}</kbd>
      </button>
      <dl class="gp-stats">
        <div>
          <dt>{{ t('detail.lastSession') }}</dt>
          <dd>{{ lastPlayed(stats?.lastPlayed) }}</dd>
        </div>
        <div>
          <dt>{{ t('detail.playtime') }}</dt>
          <dd>{{ playtime(stats?.playtimeSec ?? 0) }}</dd>
        </div>
      </dl>
      <GameActions
        :game-id="game.id"
        :favorite="!!stats?.favorite"
        :actions="actions"
        @favorite="emit('favorite', game)"
      />
    </div>
    <div class="gp-columns">
      <JournalBox :journal="journal" @save="save" />
      <div class="gp-side">
        <GameProgress :game-id="game.id" :stats="stats" :all-tags="allTags" />
        <CommunityLinks :journal="journal" :detected="detected" @save="save" />
        <GameFacts
          :game="game"
          :target="target"
          :launch-exe="launchExe"
          @pick="emit('pick', game.id, $event)"
          @exe="(id, path) => emit('exe', id, path)"
        />
      </div>
    </div>
  </article>
</template>
