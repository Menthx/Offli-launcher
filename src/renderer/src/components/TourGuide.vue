<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import type { Game, Settings } from '../../../shared/types'
import { t } from '../i18n'
import { TOUR_STEPS, type TourAction, stepTitle, tourReduce } from '../tour'
import { PAD, type Rect, bubbleStyle, px, targetRect, trapFocus } from './tour/geometry'
import TourBody from './tour/TourBody.vue'
import TourLogo from './tour/TourLogo.vue'

/** Seven steps: centered dialogs or bubbles next to highlighted elements */
const props = defineProps<{
  settings: Settings
  games: Game[]
  scanning: boolean
  selectedId: string | undefined
}>()
const emit = defineEmits<{
  select: [id: string | undefined]
  save: [patch: Partial<Settings>]
  /** The parent saves tutorialDone */
  close: []
}>()

const step = ref(0)
const rect = ref<Rect | null>(null)
// Real bubble height, to keep it fully on screen
const cardH = ref(300)
const dialog = useTemplateRef('dialog')
const primary = useTemplateRef('primary')
const current = computed(() => TOUR_STEPS[step.value]!)
const last = computed(() => step.value === TOUR_STEPS.length - 1)

const go = (action: TourAction): void => {
  const r = tourReduce(step.value, action)
  if ('done' in r) emit('close')
  else step.value = r.step
}

// Game steps: the grid for 'pickGame', a game page for 'detail' (the first game if none was clicked);
// the selection from before comes back when leaving them
const before = { saved: false, id: undefined as string | undefined }
watch(
  () => current.value.id,
  (id) => {
    const inGame = id === 'pickGame' || id === 'detail'
    if (inGame && !before.saved) {
      before.saved = true
      before.id = props.selectedId
    }
    if (id === 'pickGame' && props.selectedId) emit('select', undefined)
    if (id === 'detail' && !props.selectedId) {
      const first = props.games.find((g) => g.kind !== 'baserom')
      if (first) emit('select', first.id)
    }
    if (!inGame && before.saved) {
      before.saved = false
      if (before.id !== props.selectedId) emit('select', before.id)
    }
  },
  { immediate: true }
)

// 'pickGame' moves on by itself once a game is opened
let waitingForClick = false
watch(
  [() => current.value.id, () => props.selectedId],
  ([id, selected]) => {
    if (id !== 'pickGame') waitingForClick = false
    else if (!selected) waitingForClick = true
    else if (waitingForClick) {
      waitingForClick = false
      go('next')
    }
  },
  { immediate: true }
)

// Highlight position, measured again on resize
let frame = 0
let late = 0
const measure = (): void => {
  const s = current.value
  cancelAnimationFrame(frame)
  if (s.kind !== 'spotlight' || !s.target) {
    rect.value = null
    return
  }
  const target = s.target
  frame = requestAnimationFrame(() => (rect.value = targetRect(target, s.first)))
}
watch(
  [current, () => props.selectedId],
  () => {
    measure()
    // The game page may animate in: measure again once it's done
    window.clearTimeout(late)
    late = window.setTimeout(measure, 450)
  },
  { immediate: true, flush: 'post' }
)
window.addEventListener('resize', measure)
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.clearTimeout(late)
  window.removeEventListener('resize', measure)
})

watch(
  [step, rect],
  () => {
    if (dialog.value) cardH.value = dialog.value.offsetHeight
  },
  { flush: 'post' }
)
watch(
  step,
  async () => {
    await nextTick()
    primary.value?.focus()
  },
  { immediate: true }
)

// Esc skips, Enter or → goes next, ← goes back; focus is trapped
const onKeyDown = (e: KeyboardEvent): void => {
  const onControl = (e.target as HTMLElement).closest('button, input, select')
  if (e.key === 'Escape') {
    e.preventDefault()
    go('skip')
  } else if (e.key === 'ArrowRight' || (e.key === 'Enter' && !onControl)) {
    e.preventDefault()
    go('next')
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    go('back')
  } else if (e.key === 'Tab' && dialog.value) {
    trapFocus(e, dialog.value)
  }
}

// Nothing to highlight yet (no folder, no game): show the step as a centered dialog
const spotlight = computed(() => current.value.kind === 'spotlight' && !!rect.value)
const ringStyle = computed(() => {
  const r = rect.value
  return r && px({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
})
const cardStyle = computed(() =>
  spotlight.value && rect.value ? bubbleStyle(rect.value, current.value.side, cardH.value) : undefined
)
</script>

<template>
  <div
    :class="[
      'tour',
      spotlight ? 'is-spotlight' : 'is-modal',
      { 'is-passthrough': spotlight && current.id === 'pickGame' }
    ]"
    @keydown="onKeyDown"
  >
    <div v-if="spotlight && ringStyle" class="tour-ring" aria-hidden="true" :style="ringStyle" />
    <div v-else class="tour-scrim" aria-hidden="true" />
    <div
      ref="dialog"
      :class="['tour-card', spotlight ? `bubble side-${current.side}` : 'modal-card']"
      :style="cardStyle"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <TourLogo v-if="current.id === 'welcome'" />
      <p class="tour-step">{{ t('tour.step', { n: step + 1, total: TOUR_STEPS.length }) }}</p>
      <h2 id="tour-title">{{ stepTitle(current) }}</h2>
      <TourBody
        :step="current.id"
        :settings="settings"
        :games="games"
        :scanning="scanning"
        @save="emit('save', $event)"
      />
      <div class="tour-foot">
        <span class="tour-dots" aria-hidden="true">
          <span v-for="(s, i) in TOUR_STEPS" :key="s.id" :class="['tour-dot', { on: i === step }]" />
        </span>
        <span class="tour-actions">
          <button v-if="step === 0" class="ghost" @click="go('skip')">{{ t('tour.skipTour') }}</button>
          <template v-else>
            <button class="ghost" @click="go('skip')">{{ t('tour.skip') }}</button>
            <button class="ghost" :aria-label="t('tour.previous')" @click="go('back')">{{ t('tour.back') }}</button>
          </template>
          <button ref="primary" class="cta" @click="go('next')">
            {{ step === 0 ? t('tour.start') : last ? t('tour.done') : t('tour.next') }}
          </button>
        </span>
      </div>
      <p v-if="step === 0" class="tour-hint">{{ t('tour.hint') }}</p>
      <!-- Announces the step change to screen readers -->
      <p class="visually-hidden" aria-live="polite">
        {{ t('tour.stepAnnounce', { n: step + 1, total: TOUR_STEPS.length, title: stepTitle(current) }) }}
      </p>
    </div>
  </div>
</template>
