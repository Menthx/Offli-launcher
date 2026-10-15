import { describe, expect, it } from 'vitest'
import { detectUpdateSupport } from '../src/main/updateSupport'
import { updateView } from '../src/renderer/src/updateUi'

describe('detectUpdateSupport', () => {
  const packaged = (platform: NodeJS.Platform, env: Record<string, string> = {}) =>
    detectUpdateSupport({ isPackaged: true, platform, env })

  it('ne fait rien en développement', () => {
    expect(detectUpdateSupport({ isPackaged: false, platform: 'win32', env: {} })).toEqual({ mode: 'off', reason: 'dev' })
  })

  it('installe automatiquement avec l’installeur Windows', () => {
    expect(packaged('win32')).toEqual({ mode: 'auto' })
  })

  it('renvoie vers GitHub pour la version portable de Windows', () => {
    expect(packaged('win32', { PORTABLE_EXECUTABLE_DIR: 'C:\\Jeux' })).toEqual({ mode: 'manual', reason: 'portable' })
  })

  it('installe l’AppImage mais pas le paquet .deb sous Linux', () => {
    expect(packaged('linux', { APPIMAGE: '/home/t/Offli.AppImage' })).toEqual({ mode: 'auto' })
    expect(packaged('linux')).toEqual({ mode: 'manual', reason: 'deb' })
  })

  it('vérifie seulement sur macOS (application non signée)', () => {
    expect(packaged('darwin')).toEqual({ mode: 'manual', reason: 'mac' })
  })
})

describe('updateView', () => {
  it('à jour : infobulle avec la version, un clic revérifie', () => {
    const v = updateView({ state: 'not-available' }, '0.3.0')
    expect(v).toMatchObject({ tooltip: 'Offli-Launcher est à jour (v0.3.0)', action: 'check', badge: null, disabled: false })
  })

  it('vérification : indicateur de chargement, bouton inactif', () => {
    expect(updateView({ state: 'checking' }, '0.3.0')).toMatchObject({ busy: true, disabled: true, action: 'none' })
  })

  it('disponible : pastille d’accent, un clic télécharge', () => {
    expect(updateView({ state: 'available', version: '0.4.0' }, '0.3.0')).toMatchObject({
      tooltip: 'Version 0.4.0 disponible',
      badge: 'accent',
      action: 'download'
    })
  })

  it('téléchargement : pourcentage dans l’infobulle', () => {
    expect(updateView({ state: 'downloading', percent: 42 }, '0.3.0')).toMatchObject({
      percent: 42,
      busy: true,
      tooltip: 'Téléchargement de la mise à jour : 42 %'
    })
  })

  it('téléchargée : pastille verte, un clic demande confirmation (jamais d’installation directe)', () => {
    expect(updateView({ state: 'downloaded', version: '0.4.0' }, '0.3.0')).toMatchObject({ badge: 'play', action: 'confirm-install' })
  })

  it('erreur : message court, un clic réessaie', () => {
    expect(updateView({ state: 'error', message: 'Pas de connexion à GitHub' }, '0.3.0')).toMatchObject({
      message: 'Pas de connexion à GitHub',
      action: 'check'
    })
  })

  it('non pris en charge : désactivé en développement, page GitHub sinon', () => {
    expect(updateView({ state: 'unsupported', reason: 'dev' }, '0.3.0')).toMatchObject({
      disabled: true,
      tooltip: 'Mises à jour indisponibles en développement'
    })
    expect(updateView({ state: 'unsupported', reason: 'mac', version: '0.4.0' }, '0.3.0')).toMatchObject({
      badge: 'accent',
      action: 'open-page'
    })
    expect(updateView({ state: 'unsupported', reason: 'deb' }, '0.3.0')).toMatchObject({ action: 'open-page', badge: null })
  })
})
