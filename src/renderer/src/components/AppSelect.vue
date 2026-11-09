<script setup lang="ts" generic="V extends string">
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import Icon from './Icon.vue'
import type { SelectOption } from './select'

/** DA dropdown: inset trigger, elevated list, checked option in accent; full keyboard support */
const props = defineProps<{
  id: string
  options: SelectOption<V>[]
  /** Accessible name when no <label for="id"> points to it */
  ariaLabel?: string
}>()
const value = defineModel<V>({ required: true })

const listId = useId()
const open = ref(false)
const selected = computed(() =>
  Math.max(
    0,
    props.options.findIndex((o) => o.value === value.value)
  )
)
const active = ref(selected.value)
const wrap = useTemplateRef('wrap')
const trigger = useTemplateRef('trigger')
const list = useTemplateRef('list')

const show = (): void => {
  active.value = selected.value
  open.value = true
}
const close = (focus = true): void => {
  open.value = false
  if (focus) trigger.value?.focus()
}
const choose = (i: number): void => {
  const option = props.options[i]
  if (option && i !== selected.value) value.value = option.value
  close()
}

const onPointer = (e: PointerEvent): void => {
  if (!wrap.value?.contains(e.target as Node)) close(false)
}
watch(open, async (on) => {
  document.removeEventListener('pointerdown', onPointer)
  if (!on) return
  document.addEventListener('pointerdown', onPointer)
  await nextTick()
  list.value?.focus({ preventScroll: true })
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointer))

watch([open, active], async () => {
  await nextTick()
  if (open.value) list.value?.children[active.value]?.scrollIntoView({ block: 'nearest' })
})

const onTriggerKey = (e: KeyboardEvent): void => {
  if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) return
  e.preventDefault()
  show()
}

const onListKey = (e: KeyboardEvent): void => {
  const last = props.options.length - 1
  const next: Record<string, number> = {
    ArrowDown: Math.min(last, active.value + 1),
    ArrowUp: Math.max(0, active.value - 1),
    Home: 0,
    End: last
  }
  if (e.key in next) active.value = next[e.key]!
  else if (e.key === 'Enter' || e.key === ' ') choose(active.value)
  else if (e.key === 'Escape') close()
  else if (e.key === 'Tab') return close(false)
  else return
  e.preventDefault()
  e.stopPropagation()
}
</script>

<template>
  <div ref="wrap" class="select" :data-open="open ? '' : undefined">
    <button
      :id="id"
      ref="trigger"
      type="button"
      class="input select__trigger"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-label="ariaLabel"
      @click="open ? close() : show()"
      @keydown="onTriggerKey"
    >
      <span class="select__value" :lang="options[selected]?.lang">{{ options[selected]?.label }}</span>
      <span class="chevron" aria-hidden="true"><Icon name="chevron" :size="14" /></span>
    </button>
    <ul
      v-if="open"
      :id="listId"
      ref="list"
      class="select__list"
      role="listbox"
      tabindex="-1"
      :aria-labelledby="id"
      :aria-activedescendant="`${listId}-${active}`"
      @keydown="onListKey"
    >
      <li
        v-for="(o, i) in options"
        :id="`${listId}-${i}`"
        :key="o.value"
        role="option"
        :lang="o.lang"
        :aria-selected="i === selected"
        :class="['select__option', { 'is-active': i === active }]"
        @pointermove="i !== active && (active = i)"
        @click="choose(i)"
      >
        <span>{{ o.label }}</span>
        <Icon name="check" :size="14" />
      </li>
    </ul>
  </div>
</template>
