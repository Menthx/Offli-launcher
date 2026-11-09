<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef } from 'vue'
import type { Game, SgdbImage, SgdbResult } from '../../../shared/types'
import { vFocus } from '../directives/focus'
import { t } from '../i18n'
import AppSelect from './AppSelect.vue'
import Icon from './Icon.vue'

/** SteamGridDB cover picker; every call goes through the main process */
const props = defineProps<{ game: Game }>()
const emit = defineEmits<{ close: []; picked: [] }>()

type Status = 'idle' | 'loading' | 'error-key' | 'error-network'

const MESSAGES = {
  'error-key': 'sgdb.errorKey',
  'error-network': 'sgdb.errorNetwork'
} as const

const term = ref(props.game.originalName ?? props.game.name)
const matches = shallowRef<{ id: number; name: string; year?: number }[]>([])
const sgdbId = ref<number>()
const images = shallowRef<SgdbImage[]>([])
const page = ref(0)
const hasMore = ref(false)
const status = ref<Status>('idle')
const picking = ref<number>()
const dialog = useTemplateRef('dialog')
const opener = document.activeElement as HTMLElement | null

const fail = (r: SgdbResult<unknown>): boolean => {
  if (r.ok) return false
  status.value = r.error === 'unauthorized' ? 'error-key' : 'error-network'
  return true
}

const loadGrids = async (id: number, p: number): Promise<void> => {
  status.value = 'loading'
  const r = await window.offli.sgdbGrids(id, p)
  if (fail(r) || !r.ok) return
  images.value = p === 0 ? r.value.images : [...images.value, ...r.value.images]
  hasMore.value = r.value.hasMore
  page.value = p
  status.value = 'idle'
}

const search = async (q: string): Promise<void> => {
  status.value = 'loading'
  images.value = []
  hasMore.value = false
  const r = await window.offli.sgdbSearch(q)
  if (fail(r) || !r.ok) return
  matches.value = r.value
  sgdbId.value = r.value[0]?.id
  if (r.value[0]) await loadGrids(r.value[0].id, 0)
  else status.value = 'idle'
}

// Search once on open; focus returns to the opener on close
onMounted(() => void search(term.value))
onBeforeUnmount(() => opener?.focus?.())

// Focus trap, Esc closes
const onKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
    return
  }
  if (e.key !== 'Tab' || !dialog.value) return
  const focusable = [...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), input, select')]
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last?.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first?.focus()
  }
}

const pick = async (img: SgdbImage): Promise<void> => {
  picking.value = img.id
  const r = await window.offli.sgdbPick(props.game.id, img.id)
  picking.value = undefined
  if (fail(r)) return
  emit('picked')
  emit('close')
}

const loading = computed(() => status.value === 'loading')
const gameChoice = computed({
  get: () => String(sgdbId.value),
  set: (v: string) => {
    sgdbId.value = Number(v)
    void loadGrids(Number(v), 0)
  }
})
const gameOptions = computed(() =>
  matches.value.map((m) => ({ value: String(m.id), label: m.name + (m.year ? ` (${m.year})` : '') }))
)
</script>

<template>
  <div class="modal-back" @click="emit('close')">
    <div
      ref="dialog"
      class="modal sgdb"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sgdb-title"
      @click.stop
      @keydown="onKeyDown"
    >
      <header class="modal-head">
        <h2 id="sgdb-title">{{ t('sgdb.title') }}</h2>
        <button class="round-close" :aria-label="t('common.close')" @click="emit('close')">
          <Icon name="close" :size="14" />
        </button>
      </header>

      <form class="sgdb-search" @submit.prevent="search(term)">
        <label for="sgdb-term" class="visually-hidden">{{ t('sgdb.termLabel') }}</label>
        <input id="sgdb-term" v-model="term" v-focus />
        <button class="ghost" type="submit" :disabled="loading || !term.trim()">{{ t('sgdb.search') }}</button>
      </form>

      <div v-if="matches.length > 1" class="field field-inline">
        <label for="sgdb-game">{{ t('sgdb.game') }}</label>
        <AppSelect id="sgdb-game" v-model="gameChoice" :options="gameOptions" />
      </div>

      <!-- Fixed height so the dialog doesn't resize while loading -->
      <div class="sgdb-results" :aria-busy="loading">
        <p v-if="status === 'error-key' || status === 'error-network'" class="sgdb-message" role="alert">
          {{ t(MESSAGES[status]) }}
        </p>
        <p v-else-if="!loading && images.length === 0" class="sgdb-message">
          {{ matches.length === 0 ? t('sgdb.notFound') : t('sgdb.noImages') }}
        </p>
        <div v-else class="sgdb-grid">
          <button
            v-for="(img, i) in images"
            :key="img.id"
            class="sgdb-thumb"
            :aria-label="t(hasMore ? 'sgdb.thumbMore' : 'sgdb.thumb', { i: i + 1, n: images.length })"
            :disabled="picking !== undefined"
            @click="pick(img)"
          >
            <img :src="img.thumb" alt="" loading="lazy" draggable="false" />
            <span v-if="picking === img.id" class="sgdb-picking">{{ t('sgdb.downloading') }}</span>
          </button>
        </div>
        <p v-if="loading" class="sgdb-message" role="status">{{ t('common.loading') }}</p>
      </div>

      <footer class="sgdb-foot">
        <button
          v-if="hasMore && sgdbId !== undefined"
          class="ghost"
          :disabled="loading"
          @click="loadGrids(sgdbId, page + 1)"
        >
          {{ t('sgdb.more') }}
        </button>
      </footer>
    </div>
  </div>
</template>
