import { describe, expect, it, vi } from 'vitest'
import { steamGridDbAction } from '../src/renderer/src/menuActions'

const icon = null

describe('steamGridDbAction', () => {
  it('reste visible mais désactivée sans clé, avec une aide', () => {
    const open = vi.fn()
    const a = steamGridDbAction(false, icon, open)
    expect(a.label).toBe('Choisir sur SteamGridDB…')
    expect(a.disabled).toBe(true)
    expect(a.hint).toBe('Ajoute une clé API dans Paramètres > Images')
    void a.run()
    expect(open).not.toHaveBeenCalled()
  })

  it('ouvre le choix de jaquette quand une clé est enregistrée', () => {
    const open = vi.fn()
    const a = steamGridDbAction(true, icon, open)
    expect(a.disabled).toBeFalsy()
    expect(a.hint).toBeUndefined()
    void a.run()
    expect(open).toHaveBeenCalledOnce()
  })
})
