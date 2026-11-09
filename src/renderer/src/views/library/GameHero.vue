<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Game } from '../../../../shared/types'
import { isFitUrl, useCover } from '../../composables/useCover'
import { t } from '../../i18n'

/** Banner: a wide title screen fills it; a cover, logo or icon sits whole on the right of a blurred copy */
const props = defineProps<{ game: Game }>()
const emit = defineEmits<{ back: [] }>()

const url = useCover(() => props.game.id)
const wide = ref<{ url: string; wide: boolean }>()
const isWide = computed(() => !!url.value && wide.value?.url === url.value && wide.value.wide)
const onLoad = (e: Event): void => {
  const img = e.currentTarget as HTMLImageElement
  if (url.value)
    wide.value = { url: url.value, wide: img.naturalWidth > img.naturalHeight * 1.2 && !isFitUrl(url.value) }
}
</script>

<template>
  <header :class="['gp-hero', { 'is-wide': isWide }]">
    <img v-if="url" class="gp-hero__bg" :src="url" alt="" aria-hidden="true" draggable="false" />
    <img v-if="url" class="gp-hero__art" :src="url" alt="" draggable="false" @load="onLoad" />
    <button class="gp-back" :aria-label="t('bp.backToLibrary')" @click="emit('back')">{{ t('bp.back') }}</button>
    <div class="gp-title"><slot /></div>
  </header>
</template>
