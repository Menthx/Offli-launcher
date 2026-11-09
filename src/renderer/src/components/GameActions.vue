<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { t } from '../i18n'
import type { MenuAction } from './gameActions'
import Icon from './Icon.vue'

/** Favorite star and the menu of other game actions */
const props = defineProps<{
  /** Changing game closes the menu */
  gameId: string
  favorite: boolean
  actions: MenuAction[]
}>()
const emit = defineEmits<{ favorite: [] }>()

const open = ref(false)
const wrap = useTemplateRef('wrap')
const more = useTemplateRef('more')
/** Menu items in display order */
const items = (): HTMLButtonElement[] => [
  ...(wrap.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
]

const close = (focusButton: boolean): void => {
  open.value = false
  if (focusButton) more.value?.focus()
}

watch(
  () => props.gameId,
  () => (open.value = false)
)

const onPointer = (e: PointerEvent): void => {
  if (!wrap.value?.contains(e.target as Node)) open.value = false
}
watch(open, async (on) => {
  document.removeEventListener('pointerdown', onPointer)
  if (!on) return
  document.addEventListener('pointerdown', onPointer)
  await nextTick()
  items()[0]?.focus()
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointer))

const onMenuKey = (e: KeyboardEvent): void => {
  const list = items()
  const i = list.indexOf(document.activeElement as HTMLButtonElement)
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const next = (i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length
    list[next]?.focus()
  } else if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault()
    list[e.key === 'Home' ? 0 : list.length - 1]?.focus()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close(true)
  } else if (e.key === 'Tab') {
    open.value = false
  }
}

const runAction = (a: MenuAction): void => {
  if (a.disabled) return
  close(true)
  void a.run()
}

const label = computed(() => (props.favorite ? t('common.favRemove') : t('common.favAdd')))
</script>

<template>
  <div ref="wrap" class="game-actions">
    <button
      :class="['rail-btn', 'fav-btn', { on: favorite }]"
      :aria-label="label"
      :aria-pressed="favorite"
      :data-tooltip="label"
      @click="emit('favorite')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36 6.3 20.36l1.09-6.35-4.62-4.5 6.38-.93z"
          :fill="favorite ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <button
      ref="more"
      class="rail-btn"
      :aria-label="t('detail.moreActions')"
      :data-tooltip="t('detail.moreActions')"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Icon name="menu" :size="18" />
    </button>
    <div v-if="open" class="action-menu" role="menu" :aria-label="t('detail.actionsMenu')" @keydown="onMenuKey">
      <button
        v-for="(a, i) in actions"
        :key="a.label"
        role="menuitem"
        tabindex="-1"
        :aria-disabled="a.disabled || undefined"
        :aria-describedby="a.hint ? `menu-hint-${i}` : undefined"
        :class="{ disabled: a.disabled, danger: a.danger }"
        @click="runAction(a)"
      >
        <Icon :name="a.icon" :size="18" />
        <span class="menu-text">
          {{ a.label }}
          <span v-if="a.hint" :id="`menu-hint-${i}`" class="menu-hint">{{ a.hint }}</span>
        </span>
      </button>
    </div>
  </div>
</template>
