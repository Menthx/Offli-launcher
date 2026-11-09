<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import type { Game, StartView } from '../../shared/types'
import { applyAppearance } from './appearance'
import OnboardingScreen from './components/OnboardingScreen.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ToastView from './components/ToastView.vue'
import TourGuide from './components/TourGuide.vue'
import { useLibraryData } from './composables/useLibraryData'
import { useToast } from './composables/useToast'
import { hideGame, withoutHidden } from './hiddenGames'
import { t } from './i18n'
import { shouldAutoStartTour } from './tour'
import { animateSelection } from './viewTransition'
import BigPictureView from './views/BigPictureView.vue'
import LibraryView from './views/LibraryView.vue'

const data = useLibraryData()
const { settings, games, stats, running, scanning, save } = data
const selectedId = ref<string>()
const showSettings = ref(false)
// Opens by itself on first launch (once per session), or from Settings
const tourOpen = ref(false)
let tourAutoChecked = false
const { toast, notify } = useToast()
const view = ref<StartView>('library')

// Show the cached index right away, then refresh it with a scan
void data.load().then((s) => {
  view.value = s.startView
  if (s.libraryPaths.length) void data.rescan()
})

// Theme and language before the views are drawn
watchEffect(() => settings.value && applyAppearance(settings.value), { flush: 'sync' })

// Big Picture stays windowed unless the setting says otherwise; the library always leaves full screen
const fullscreen = computed(() => view.value === 'bigpicture' && !!settings.value?.bigPictureFullscreen)
watch(fullscreen, (on) => void window.offli.setFullScreen(on), { immediate: true })

// Launch from a desktop shortcut or the taskbar menu that failed
window.offli.onNotify((n) => notify(n))

// F11 is caught by the main process
window.offli.onToggleView(() => (view.value = view.value === 'bigpicture' ? 'library' : 'bigpicture'))

watch(settings, (s) => {
  if (!s || tourAutoChecked || !shouldAutoStartTour(s)) return
  tourAutoChecked = true
  tourOpen.value = true
})

const launch = async (game: Game): Promise<void> => {
  notify({ text: t('library.launching', { name: game.name }) })
  const r = await window.offli.launch(game.id)
  if (!r.ok) notify({ text: r.error ?? t('library.launchFailed'), error: true })
}

// Hidden games disappear from every view; the game page only opens after a click
const shownGames = computed(() => (settings.value ? withoutHidden(games.value, settings.value.hiddenGames) : []))
const selected = computed(() => shownGames.value.find((g) => g.id === selectedId.value))
// The card cover flies to the game page (and back on close)
const select = (id: string | undefined): void => animateSelection(selected.value?.id, id, () => (selectedId.value = id))

const hide = (game: Game): void => {
  if (selectedId.value === game.id) selectedId.value = undefined
  void save({ hiddenGames: hideGame(settings.value!.hiddenGames, game.id) })
}
// Performance build or launcher picked on the game page; '' goes back to the detected exe
const setExe = (id: string, path: string): void => {
  const { [id]: _old, ...rest } = settings.value!.launchExe
  void save({ launchExe: path ? { ...rest, [id]: path } : rest })
}
const replayTour = (): void => {
  showSettings.value = false
  view.value = 'library'
  tourOpen.value = true
}
// Defaults include an unfinished tutorial, so it opens again
const afterReset = (): void => {
  replayTour()
  selectedId.value = undefined
  void data.load()
}
const reload = (): void => void data.load().then(() => data.rescan())
const closeTour = (): void => {
  tourOpen.value = false
  // Finished or skipped: never auto-open again
  if (!settings.value?.tutorialDone) void save({ tutorialDone: true })
}
</script>

<template>
  <div v-if="!settings" class="boot" />
  <template v-else>
    <OnboardingScreen
      v-if="!settings.libraryPaths.length"
      :paths="settings.libraryPaths"
      :games="shownGames"
      :scanning="scanning"
      @change="save({ libraryPaths: $event })"
    />
    <BigPictureView
      v-else-if="view === 'bigpicture'"
      :games="shownGames"
      :stats="stats"
      :selected="selected"
      :running="running"
      :sort="settings.librarySort"
      @select="select"
      @launch="launch"
      @favorite="data.favorite"
      @sort="save({ librarySort: $event })"
      @exit="view = 'library'"
    />
    <LibraryView
      v-else
      :games="shownGames"
      :stats="stats"
      :selected="selected"
      :running="running"
      :sort="settings.librarySort"
      :scanning="scanning"
      :custom-covers="settings.coverOverrides"
      :launch-exe="settings.launchExe"
      :has-sgdb-key="!!settings.hasSteamGridDbKey"
      @select="select"
      @launch="launch"
      @favorite="data.favorite"
      @sort="save({ librarySort: $event })"
      @open-settings="showSettings = true"
      @big-picture="view = 'bigpicture'"
      @cover-changed="data.coverChanged"
      @rename="data.rename"
      @hide="hide"
      @exe="setExe"
    />
    <SettingsPanel
      v-if="showSettings"
      :settings="settings"
      :games="games"
      :scanning="scanning"
      :scan="data.rescan"
      @save="save"
      @imported="reload"
      @replay-tour="replayTour"
      @reset="afterReset"
      @close="showSettings = false"
    />
    <!-- First launch: the tutorial also opens over the folder picker screen -->
    <TourGuide
      v-if="tourOpen && view === 'library'"
      :settings="settings"
      :games="shownGames"
      :scanning="scanning"
      :selected-id="selected?.id"
      @select="select"
      @save="save"
      @close="closeTour"
    />
  </template>
  <ToastView :toast="toast" />
</template>
