import { describe, expect, it } from 'vitest'
import { addFolder, addFolderLabel, folderStatus, removeFolder } from '../src/renderer/src/folders'

describe('liste des dossiers (FolderList)', () => {
  it('ajoute un dossier choisi, sans doublon, et ignore un choix annulé', () => {
    expect(addFolder(['D:\\Pokemon'], 'E:\\Romhacks')).toEqual(['D:\\Pokemon', 'E:\\Romhacks'])
    const paths = ['D:\\Pokemon']
    expect(addFolder(paths, 'D:\\Pokemon')).toBe(paths)
    expect(addFolder(paths, null)).toBe(paths)
  })

  it('retire un dossier', () => {
    expect(removeFolder(['D:\\A', 'E:\\B'], 'D:\\A')).toEqual(['E:\\B'])
  })

  it('affiche la ligne d’état du scan', () => {
    const games = [{ kind: 'fangame' }, { kind: 'romhack' }, { kind: 'baserom' }]
    expect(folderStatus([], games, false)).toBe("Aucun dossier pour l'instant.")
    expect(folderStatus(['D:\\Pokemon'], games, true)).toBe('Scan en cours…')
    // Les ROMs de base ne comptent pas parmi les jeux
    expect(folderStatus(['D:\\Pokemon'], games, false)).toBe('2 jeux trouvés · 1 fangame, 1 ROM')
  })

  it('adapte le libellé du bouton d’ajout', () => {
    expect(addFolderLabel([])).toBe('+ Ajouter un dossier')
    expect(addFolderLabel(['D:\\Pokemon'])).toBe('+ Ajouter un autre dossier')
  })
})
