<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Game, Settings } from '../../../shared/types'
import { vFocus } from '../directives/focus'
import { hiddenGamesOf } from '../hiddenGames'
import { type TKey, t } from '../i18n'
import Icon from './Icon.vue'
import DisplayTab from './settings/DisplayTab.vue'
import EmulatorsTab from './settings/EmulatorsTab.vue'
import HiddenTab from './settings/HiddenTab.vue'
import ImagesTab from './settings/ImagesTab.vue'
import LibraryTab from './settings/LibraryTab.vue'
import { type Tab, TABS, lastTab, nextTab, rememberTab } from './settings/tabs'

/** Nav on the left (surface), content on the right (elevated) */
const props = defineProps<{
  settings: Settings
  /** Whole library, hidden games included (for the Hidden games tab) */
  games: Game[]
  scanning: boolean
  scan: () => unknown
}>()
const emit = defineEmits<{
  save: [patch: Partial<Settings>]
  /** Backup imported: reload everything from the main process */
  imported: []
  reset: []
  /** Closes Settings and restarts the tutorial */
  replayTour: []
  close: []
}>()

const tab = ref<Tab>(lastTab())
const tabRefs: Partial<Record<Tab, HTMLButtonElement>> = {}
const hiddenCount = computed(() => hiddenGamesOf(props.games, props.settings.hiddenGames).length)
const current = computed(() => TABS.find((x) => x.id === tab.value)!)

const setTab = (next: Tab, focus = false): void => {
  rememberTab(next)
  tab.value = next
  if (focus) tabRefs[next]?.focus()
}
const onTabKey = (e: KeyboardEvent): void => {
  const next = nextTab(
    e.key,
    TABS.findIndex((x) => x.id === tab.value)
  )
  if (next < 0) return
  e.preventDefault()
  setTab(TABS[next]!.id, true)
}
const save = (patch: Partial<Settings>): void => emit('save', patch)
const label = (key: TKey): string => t(key)
</script>

<template>
  <div class="modal-back" @click="emit('close')" @keydown.esc="emit('close')">
    <div class="settings" role="dialog" aria-modal="true" aria-labelledby="settings-title" @click.stop>
      <nav
        class="settings__nav"
        role="tablist"
        aria-orientation="vertical"
        :aria-label="t('settings.sections')"
        @keydown="onTabKey"
      >
        <h2 id="settings-title" class="settings__title">{{ t('common.settings') }}</h2>
        <button
          v-for="item in TABS"
          :id="`tab-${item.id}`"
          :key="item.id"
          :ref="(el) => (tabRefs[item.id] = el as HTMLButtonElement)"
          v-focus="tab === item.id"
          role="tab"
          class="settings__tab"
          :aria-selected="tab === item.id"
          :aria-controls="`panel-${item.id}`"
          :tabindex="tab === item.id ? 0 : -1"
          @click="setTab(item.id)"
        >
          {{ label(item.label) }}
          <span v-if="item.id === 'hidden' && hiddenCount > 0" class="count">{{ hiddenCount }}</span>
        </button>
      </nav>

      <div :id="`panel-${tab}`" class="settings__panel" role="tabpanel" :aria-labelledby="`tab-${tab}`" tabindex="0">
        <h3 class="settings__panel-title">{{ label(current.label) }}</h3>
        <LibraryTab
          v-if="tab === 'library'"
          :settings="settings"
          :games="games"
          :scanning="scanning"
          :scan="scan"
          @save="save"
          @imported="emit('imported')"
          @reset="emit('reset')"
        />
        <DisplayTab v-if="tab === 'display'" :settings="settings" @save="save" @replay-tour="emit('replayTour')" />
        <EmulatorsTab v-if="tab === 'emulators'" :settings="settings" @save="save" />
        <ImagesTab v-if="tab === 'images'" :settings="settings" @save="save" />
        <HiddenTab v-if="tab === 'hidden'" :settings="settings" :games="games" @save="save" />
      </div>

      <button
        class="icon-btn settings__close"
        :aria-label="t('common.close')"
        :data-tooltip="`${t('common.close')}|${t('common.keyEsc')}`"
        @click="emit('close')"
      >
        <Icon name="close" />
      </button>
    </div>
  </div>
</template>
