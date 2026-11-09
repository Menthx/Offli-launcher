<script setup lang="ts">
import SettingsRow from './SettingsRow.vue'

/** On/off row: the default slot is the label */
const { id, desc } = defineProps<{ id: string; desc?: string }>()
const checked = defineModel<boolean>({ required: true })
</script>

<template>
  <SettingsRow :desc="desc" :label-id="`${id}-label`">
    <template #label><slot /></template>
    <button
      :id="id"
      class="toggle"
      role="switch"
      :aria-checked="checked"
      :aria-labelledby="`${id}-label`"
      @click="checked = !checked"
    >
      <span aria-hidden="true" />
    </button>
  </SettingsRow>
</template>
