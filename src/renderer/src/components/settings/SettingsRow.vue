<script setup lang="ts">
/** Label | control row; the label slot replaces the label text */
defineProps<{
  label?: string
  desc?: string
  labelId?: string
  htmlFor?: string
  stacked?: boolean
}>()
</script>

<template>
  <div :class="['settings-row', { 'settings-row--stacked': stacked }]">
    <div class="settings-row__text">
      <component :is="htmlFor ? 'label' : 'span'" :id="labelId" class="settings-row__label" :for="htmlFor">
        <slot name="label">{{ label }}</slot>
      </component>
      <p v-if="desc" class="settings-row__desc">{{ desc }}</p>
    </div>
    <div v-if="$slots.default" class="settings-row__control"><slot /></div>
  </div>
</template>
