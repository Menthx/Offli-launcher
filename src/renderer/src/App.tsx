import { useEffect, useRef, useState } from 'react'
import type { Game, GameStats, LibrarySort, StartView } from '../../shared/types'
import { t } from '../../shared/i18n'
import { applyAppearance } from './appearance'
import { Onboarding } from './components/Onboarding'
import { SettingsPanel } from './components/SettingsPanel'
import { Tour } from './components/Tour'
import { hideGame, withoutHidden } from './hiddenGames'
import { useLibraryData } from './hooks/useLibraryData'
import { ToastView, useToast } from './hooks/useToast'
import { shouldAutoStartTour } from './tour'
import { animateSelection } from './viewTransition'
import { BigPictureView } from './views/BigPictureView'
import { LibraryView } from './views/LibraryView'

export interface ViewProps {
  games: Game[]
  stats: Record<string, GameStats>
  selected: Game | undefined
  onSelect(id: string | undefined): void
  onLaunch(game: Game): void
  onFavorite(game: Game): void
  /** Running games: id → launch time */
  running: Record<string, number>
  sort: LibrarySort
  onSort(sort: LibrarySort): void
}

export function App(): React.JSX.Element {
  const data = useLibraryData()
  const { settings, games, stats, scanning, save } = data
  const [selectedId, setSelectedId] = useState<string>()
  const [showSettings, setShowSettings] = useState(false)
  // Opens by itself on first launch (once per session), or from Settings
  const [tourOpen, setTourOpen] = useState(false)
  const tourAutoChecked = useRef(false)
  const [toast, notify] = useToast()
  const [view, setView] = useState<StartView>('library')

  // Show the cached index right away, then refresh it with a scan
  useEffect(() => {
    void data.load().then((s) => {
      setView(s.startView)
      if (s.libraryPaths.length) void data.rescan()
    })
  }, [])

  // Big Picture stays windowed unless the setting says otherwise; the library always leaves full screen
  const fullscreen = view === 'bigpicture' && !!settings?.bigPictureFullscreen
  useEffect(() => {
    void window.offli.setFullScreen(fullscreen)
  }, [fullscreen])

  // F11 is caught by the main process
  useEffect(() => window.offli.onToggleView(() => setView((v) => (v === 'bigpicture' ? 'library' : 'bigpicture'))), [])

  const launch = async (game: Game): Promise<void> => {
    notify({ text: t('library.launching', { name: game.name }) })
    const r = await window.offli.launch(game.id)
    if (!r.ok) notify({ text: r.error ?? t('library.launchFailed'), error: true })
  }

  useEffect(() => {
    if (!settings || tourAutoChecked.current || !shouldAutoStartTour(settings)) return
    tourAutoChecked.current = true
    setTourOpen(true)
  }, [settings])

  if (!settings) return <div className="boot" />
  applyAppearance(settings)

  // Hidden games disappear from every view; the game sheet only opens after a click
  const shownGames = withoutHidden(games, settings.hiddenGames)
  const selected = shownGames.find((g) => g.id === selectedId)
  const props: ViewProps = {
    games: shownGames,
    stats,
    selected,
    // The card cover flies to the game sheet (and back on close)
    onSelect: (id) => animateSelection(selected?.id, id, () => setSelectedId(id)),
    running: data.running,
    sort: settings.librarySort,
    onSort: (librarySort) => void save({ librarySort }),
    onLaunch: launch,
    onFavorite: (game) => void data.favorite(game)
  }

  return (
    <>
      {!settings.libraryPaths.length ? (
        <Onboarding
          paths={settings.libraryPaths}
          onChange={(libraryPaths) => save({ libraryPaths })}
          games={shownGames}
          scanning={scanning}
        />
      ) : view === 'bigpicture' ? (
        <BigPictureView {...props} onExit={() => setView('library')} />
      ) : (
        <LibraryView
          {...props}
          scanning={scanning}
          onOpenSettings={() => setShowSettings(true)}
          onBigPicture={() => setView('bigpicture')}
          customCovers={settings.coverOverrides}
          hasSgdbKey={!!settings.hasSteamGridDbKey}
          onCoverChanged={(id) => void data.coverChanged(id)}
          onRename={data.rename}
          onHide={(game) => {
            if (selectedId === game.id) setSelectedId(undefined)
            void save({ hiddenGames: hideGame(settings.hiddenGames, game.id) })
          }}
        />
      )}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          games={games}
          onSave={save}
          scanning={scanning}
          onScan={data.rescan}
          onImported={() => void data.load().then(() => data.rescan())}
          onReplayTour={() => {
            setShowSettings(false)
            setView('library')
            setTourOpen(true)
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
      {/* First launch: the tutorial also opens over the folder picker screen */}
      {tourOpen && view === 'library' && (
        <Tour
          settings={settings}
          games={shownGames}
          scanning={scanning}
          selectedId={selected?.id}
          onSelect={props.onSelect}
          onSave={save}
          onClose={() => {
            setTourOpen(false)
            // Finished or skipped: never auto-open again
            if (!settings.tutorialDone) void save({ tutorialDone: true })
          }}
        />
      )}
      <ToastView toast={toast} />
    </>
  )
}
