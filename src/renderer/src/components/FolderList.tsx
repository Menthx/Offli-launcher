import { t } from '../../../shared/i18n'
import { addFolder, addFolderLabel, folderStatus, removeFolder } from '../folders'

interface Props {
  paths: string[]
  /** The caller saves it, which triggers a rescan */
  onChange(paths: string[]): unknown
  games: { kind: string }[]
  scanning: boolean
}

/** Shared by the tutorial, settings and first-launch screen: one row per folder, a real folder picker and the scan status */
export function FolderList({ paths, onChange, games, scanning }: Props): React.JSX.Element {
  return (
    <div className="folder-picker">
      {paths.length > 0 && (
        <ul className="folder-list" aria-label={t('folders.listLabel')}>
          {paths.map((dir) => (
            <li key={dir}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              >
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span className="folder-path" data-tooltip={dir}>
                {dir}
              </span>
              <button
                className="icon-btn"
                aria-label={t('folders.removeDir', { dir })}
                data-tooltip={t('folders.remove')}
                onClick={() => onChange(removeFolder(paths, dir))}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        className="folder-add"
        onClick={async () => {
          const next = addFolder(paths, await window.offli.pickFolder())
          if (next !== paths) await onChange(next)
        }}
      >
        {addFolderLabel(paths)}
      </button>
      <p className="folder-status" role="status">
        {folderStatus(paths, games, scanning)}
      </p>
    </div>
  )
}
