<script setup lang="ts">
/** Settings group card, with an optional title */
defineProps<{ title?: string; id?: string }>()
</script>

<template>
  <section class="settings-group" :aria-labelledby="title && id ? id : undefined">
    <h4 v-if="title" :id="id" class="settings-group__title">{{ title }}</h4>
    <div class="settings-group__card"><slot /></div>
  </section>
</template>
