<script setup lang="ts">
import type { Game, Settings } from '../../../../shared/types'
import { t } from '../../i18n'
import { THEMES, themeLabel } from '../../theme'
import type { TourStepId } from '../../tour'
import FolderList from '../FolderList.vue'

defineProps<{ step: TourStepId; settings: Settings; games: Game[]; scanning: boolean }>()
const emit = defineEmits<{ save: [patch: Partial<Settings>] }>()
</script>

<template>
  <p v-if="step === 'welcome'">{{ t('tour.welcomeBody') }}</p>
  <FolderList
    v-else-if="step === 'folders'"
    :paths="settings.libraryPaths"
    :games="games"
    :scanning="scanning"
    @change="emit('save', { libraryPaths: $event })"
  />
  <p v-else-if="step === 'sidebar'">{{ t('tour.sidebarBody') }}</p>
  <p v-else-if="step === 'pickGame'">{{ t('tour.pickGameBody') }}</p>
  <p v-else-if="step === 'detail'">{{ t('tour.detailBody') }}</p>
  <template v-else-if="step === 'settings'">
    <p>{{ t('tour.settingsBody') }}</p>
    <div class="tour-themes" role="group" :aria-label="t('settings.theme')">
      <button
        v-for="th in THEMES"
        :key="th.id"
        :class="['tour-chip', { on: settings.theme === th.id }]"
        :aria-pressed="settings.theme === th.id"
        @click="emit('save', { theme: th.id })"
      >
        <span class="swatches" aria-hidden="true">
          <span v-for="c in th.swatches.slice(0, 3)" :key="c" class="swatch" :style="{ background: c }" />
        </span>
        {{ themeLabel(th.id) }}
      </button>
    </div>
  </template>
  <template v-else-if="step === 'bigpicture'">
    <p>{{ t('tour.bigpictureBody') }}</p>
    <dl class="tour-keys">
      <dt><kbd>F11</kbd></dt>
      <dd>{{ t('tour.keyOpenBp') }}</dd>
      <dt>
        <kbd>{{ t('common.keyEsc') }}</kbd> / <kbd>B</kbd>
      </dt>
      <dd>{{ t('tour.keyBack') }}</dd>
      <dt><kbd>A</kbd></dt>
      <dd>{{ t('tour.keyLaunch') }}</dd>
    </dl>
  </template>
</template>
