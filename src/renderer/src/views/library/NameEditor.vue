<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Game } from '../../../../shared/types'
import Icon from '../../components/Icon.vue'
import { vFocus } from '../../directives/focus'
import { t } from '../../i18n'

/** Click to rename: Enter saves, Esc cancels, empty restores the detected name */
const props = defineProps<{ game: Game }>()
const emit = defineEmits<{ rename: [game: Game, name: string | null] }>()

const editing = ref(false)
const draft = ref(props.game.name)
let cancelled = false

watch(
  () => props.game.id,
  () => (editing.value = false)
)

const start = (): void => {
  cancelled = false
  draft.value = props.game.name
  editing.value = true
}
const commit = (): void => {
  editing.value = false
  if (cancelled) return
  const name = draft.value.trim()
  const { game } = props
  if (name === game.name) return
  const original = game.originalName ?? game.name
  emit('rename', game, !name || name === original ? null : name)
}
const onKey = (e: KeyboardEvent): void => {
  const input = e.currentTarget as HTMLInputElement
  if (e.key === 'Enter') input.blur()
  if (e.key === 'Escape') {
    cancelled = true
    input.blur()
  }
}
</script>

<template>
  <div class="name-editor">
    <input
      v-if="editing"
      v-model="draft"
      v-focus
      class="name-input"
      :aria-label="t('detail.gameName')"
      @focus="($event.currentTarget as HTMLInputElement).select()"
      @blur="commit"
      @keydown="onKey"
    />
    <h3 v-else>
      <button class="name-btn" :data-tooltip="t('detail.rename')" @click="start">
        {{ game.name }}
        <Icon name="pencil" :size="14" />
      </button>
    </h3>
    <p v-if="game.originalName" class="muted">
      {{ t('detail.originalName', { name: game.originalName }) }} ·
      <button class="link" @click="emit('rename', game, null)">{{ t('detail.restore') }}</button>
    </p>
  </div>
</template>
