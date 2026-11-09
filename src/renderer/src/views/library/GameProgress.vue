<script setup lang="ts">
import { computed, ref } from 'vue'
import { GAME_STATUSES, TAG_MAX_LENGTH, cleanTags } from '../../../../shared/gameStatus'
import type { GameStats, GameStatus } from '../../../../shared/types'
import AppSelect from '../../components/AppSelect.vue'
import Icon from '../../components/Icon.vue'
import { t } from '../../i18n'

/** Status (to play, started, finished, dropped) and collections, set by the player; shown in the sidebar */
const props = defineProps<{ gameId: string; stats: GameStats | undefined; allTags: string[] }>()

const tags = computed(() => props.stats?.tags ?? [])
const status = computed({
  get: () => (props.stats?.status ?? '') as GameStatus | '',
  set: (s: GameStatus | '') => void window.offli.updateGame(props.gameId, { status: s || undefined })
})
const statusOptions = computed(() => [
  { value: '' as GameStatus | '', label: t('detail.statusNone') },
  ...GAME_STATUSES.map((s) => ({ value: s as GameStatus | '', label: t(`status.${s}`) }))
])
const suggestions = computed(() => props.allTags.filter((tag) => !tags.value.includes(tag)))

const draft = ref('')
const saveTags = (next: string[]): void => void window.offli.updateGame(props.gameId, { tags: cleanTags(next) })
const add = (): void => {
  if (draft.value.trim()) saveTags([...tags.value, draft.value])
  draft.value = ''
}
</script>

<template>
  <section class="gp-box gp-progress" aria-labelledby="progress-title">
    <header class="gp-box__head">
      <h5 id="progress-title">{{ t('detail.status') }}</h5>
    </header>
    <AppSelect
      id="status-select"
      v-model="status"
      class="select--sm"
      :options="statusOptions"
      :aria-label="t('detail.status')"
    />
    <header class="gp-box__head">
      <h5>{{ t('detail.collections') }}</h5>
    </header>
    <ul v-if="tags.length" class="tag-list">
      <li v-for="tag in tags" :key="tag" class="tag">
        {{ tag }}
        <button
          class="tag__remove"
          :aria-label="t('detail.removeTag', { name: tag })"
          @click="saveTags(tags.filter((x) => x !== tag))"
        >
          <Icon name="close" :size="12" />
        </button>
      </li>
    </ul>
    <form class="tag-add" @submit.prevent="add">
      <input
        v-model="draft"
        class="input"
        list="tag-suggestions"
        :maxlength="TAG_MAX_LENGTH"
        :placeholder="t('detail.tagPlaceholder')"
        :aria-label="t('detail.addTag')"
        @keydown.esc.stop="draft = ''"
      />
      <datalist id="tag-suggestions">
        <option v-for="s in suggestions" :key="s" :value="s" />
      </datalist>
      <button class="icon-square" type="submit" :aria-label="t('detail.addTag')" :data-tooltip="t('detail.addTag')">
        <Icon name="plus" :size="16" />
      </button>
    </form>
  </section>
</template>
