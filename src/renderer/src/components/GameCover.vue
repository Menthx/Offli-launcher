<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Game } from '../../../shared/types'
import { isFitUrl, useCover } from '../composables/useCover'
import { PLATFORM_LABEL } from '../format'

/** Loaded image shape: cover art, square icon (Icon.png, .exe) or tiny pixel-art icon */
type Shape = 'cover' | 'icon' | 'pixel'

function shapeOf(img: HTMLImageElement): Shape {
  const { naturalWidth: w, naturalHeight: h } = img
  if (w <= 64) return 'pixel'
  return Math.abs(w - h) <= 2 ? 'icon' : 'cover'
}

/** Game cover, or an empty slot with the name when no image is found */
const { game, wide = false } = defineProps<{ game: Game; wide?: boolean }>()

const url = useCover(
  () => game.id,
  () => (wide ? 'full' : 'thumb')
)
// A new URL counts as 'cover' until it has loaded
const measured = ref<{ url: string; shape: Shape }>()
const shape = computed(() => (measured.value && measured.value.url === url.value ? measured.value.shape : 'cover'))
// Icons are centered on a blurred copy of themselves; romhack covers are shown whole
const icon = computed(() => shape.value !== 'cover')
const fit = computed(() => icon.value || game.kind !== 'fangame' || (!!url.value && isFitUrl(url.value)))

const onLoad = (e: Event): void => {
  if (url.value) measured.value = { url: url.value, shape: shapeOf(e.currentTarget as HTMLImageElement) }
}
</script>

<template>
  <div :class="['cover', { wide, empty: !url, fit: url && fit, icon: url && icon }]">
    <img v-if="url && fit" :src="url" alt="" aria-hidden="true" draggable="false" class="backdrop" />
    <img
      v-if="url"
      :src="url"
      alt=""
      loading="lazy"
      draggable="false"
      :class="shape === 'pixel' ? 'main pixel' : 'main'"
      @load="onLoad"
    />
    <span v-else class="cover-name">{{ game.name }}</span>
    <span :class="['badge', game.kind === 'fangame' ? 'fan' : 'rom']">{{ PLATFORM_LABEL[game.platform] }}</span>
  </div>
</template>
