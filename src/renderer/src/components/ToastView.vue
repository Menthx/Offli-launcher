<script setup lang="ts">
import type { Toast } from '../composables/useToast'

defineProps<{ toast: Toast | null }>()
</script>

<template>
  <div :class="['toast', { show: toast, error: toast?.error }]" role="status" aria-live="polite">
    <svg
      v-if="toast"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        :d="
          toast.error
            ? 'M12 8v5M12 16.5h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'
            : 'M5 12.5l4.5 4.5L19 7.5'
        "
      />
    </svg>
    <span>{{ toast?.text }}</span>
  </div>
</template>
