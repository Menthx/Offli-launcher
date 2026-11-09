<script setup lang="ts">
import { t } from '../../i18n'
import type { Filter } from '../library/filters'
import type { BpSection } from './sections'

/** LB / RB (or Q / E) switch section */
defineProps<{ sections: BpSection[]; current: Filter }>()
const emit = defineEmits<{ pick: [f: Filter] }>()
</script>

<template>
  <nav class="bp-tabs" :aria-label="t('bp.section')">
    <span class="bp-bumper" aria-hidden="true">LB</span>
    <button
      v-for="s in sections"
      :key="s.filter"
      class="bp-tab"
      :aria-pressed="s.filter === current"
      tabindex="-1"
      @click="emit('pick', s.filter)"
    >
      {{ s.label }}
      <span class="count">{{ s.count }}</span>
    </button>
    <span class="bp-bumper" aria-hidden="true">RB</span>
  </nav>
</template>
