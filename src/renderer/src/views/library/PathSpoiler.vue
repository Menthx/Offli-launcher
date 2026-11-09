<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../../i18n'

/** Hidden until revealed (not in the DOM nor a tooltip); keyed by game so it hides again on change */
defineProps<{ path: string }>()
const shown = ref(false)
</script>

<template>
  <button v-if="!shown" class="spoiler" :aria-label="t('detail.showPath')" :aria-expanded="false" @click="shown = true">
    <span class="spoiler-blur" aria-hidden="true">████████ ██████ ███████████</span>
    <span class="spoiler-hint" aria-hidden="true">{{ t('common.show') }}</span>
  </button>
  <span v-else class="spoiler-shown">
    {{ path }}
    <button class="link" :aria-label="t('detail.hidePath')" :aria-expanded="true" @click="shown = false">
      {{ t('detail.hide') }}
    </button>
  </span>
</template>
