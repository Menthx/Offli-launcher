<script setup lang="ts">
import { ref, watch } from 'vue'
import { isFitUrl } from '../../composables/useCover'

interface Layer {
  id: string
  url: string
  /** Wide image (title screen): full bleed; otherwise blurred backdrop + art on the right */
  wide: boolean
  /** Small image: scaled up without smoothing */
  pixel: boolean
}

/** New layer fades in over the previous one, so switching games never flashes */
const props = defineProps<{ id: string; url: string | null }>()
const layers = ref<Layer[]>([])

watch(
  () => [props.id, props.url] as const,
  ([id, url]) => {
    if (!url) return
    const img = new Image()
    img.onload = () => {
      // Ignore images that arrive after the game changed
      if (props.url !== url) return
      const layer = {
        id,
        url,
        // A logo is never stretched to full bleed
        wide: img.naturalWidth > img.naturalHeight * 1.2 && !isFitUrl(url),
        pixel: img.naturalWidth <= 128
      }
      layers.value = [...layers.value.filter((l) => l.id !== id).slice(-1), layer]
    }
    img.src = url
  },
  { immediate: true }
)
</script>

<template>
  <div class="bp-backdrop" aria-hidden="true">
    <div
      v-for="l in layers"
      :key="l.id"
      :class="['bp-layer', l.wide ? 'bp-layer--wide' : 'bp-layer--art', { 'is-pixel': l.pixel }]"
    >
      <img class="bp-layer__bg" :src="l.url" alt="" draggable="false" />
      <img v-if="!l.wide" class="bp-layer__art" :src="l.url" alt="" draggable="false" />
    </div>
  </div>
</template>
