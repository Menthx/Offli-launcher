<script setup lang="ts">
import type { Game } from '../../../shared/types'
import logo from '../assets/logo.png'
import { t } from '../i18n'
import FolderList from './FolderList.vue'

/** First launch without a folder */
defineProps<{ paths: string[]; games: Game[]; scanning: boolean }>()
const emit = defineEmits<{ change: [paths: string[]] }>()
</script>

<template>
  <div class="onboarding">
    <img class="onboarding-logo" :src="logo" alt="" aria-hidden="true" draggable="false" />
    <h1>Offli-Launcher</h1>
    <p>{{ t('onboarding.choose') }}</p>
    <p>{{ t('onboarding.sorts') }}</p>
    <div class="onboarding-folders surface-card">
      <FolderList :paths="paths" :games="games" :scanning="scanning" @change="emit('change', $event)" />
    </div>
  </div>
</template>
