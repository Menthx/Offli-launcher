<script setup lang="ts">
import { type IconName, PATHS } from './icons'

const { name, size = 16 } = defineProps<{ name: IconName; size?: number }>()
</script>

<template>
  <svg v-if="name === 'play'" :width="size" :height="size" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 2.2v11.6L13.5 8z" fill="currentColor" />
  </svg>
  <svg
    v-else
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    :stroke-width="name === 'more' ? 3 : 1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path :d="PATHS[name]" />
  </svg>
</template>
