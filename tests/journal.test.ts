import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { makeBackup, readBackup } from '../src/main/backup'
import { detectLinks, findLinks } from '../src/main/journal/detect'
import { parseOffliMd, parseUrlShortcut } from '../src/main/journal/offliMd'
import { cleanJournal, cleanJournals } from '../src/main/journal/store'
import { DEFAULT_SETTINGS } from '../src/main/store'
import { linkKind, normalizeUrl } from '../src/shared/links'
import type { Game } from '../src/shared/types'

describe('links', () => {
  it('tells Discord invites, channels and wikis apart', () => {
    expect(linkKind('https://discord.gg/abc')).toBe('server')
    expect(linkKind('https://discord.com/invite/abc')).toBe('server')
    expect(linkKind('https://discord.com/channels/123/456')).toBe('channel')
    expect(linkKind('https://pokefallen.fandom.com/wiki/Accueil')).toBe('wiki')
    expect(linkKind('https://bulbapedia.bulbagarden.net/wiki/X')).toBe('wiki')
    expect(linkKind('https://reliccastle.com/x')).toBe('site')
  })

  it("follows the player's name for the link", () => {
    expect(linkKind('https://github.com/Menthx/Offli-launcher', 'wiki')).toBe('wiki')
    expect(linkKind('https://example.com', 'Salon entraide')).toBe('channel')
    expect(linkKind('https://example.com', 'Mon Discord')).toBe('server')
    expect(linkKind('https://discord.gg/abc', 'Communauté')).toBe('server')
  })

  it('accepts bare addresses, refuses other schemes', () => {
    expect(normalizeUrl('discord.gg/abc')).toBe('https://discord.gg/abc')
    expect(normalizeUrl('  https://wiki.example.org ')).toBe('https://wiki.example.org/')
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('file:///C:/x')).toBeNull()
    expect(normalizeUrl('pas une adresse')).toBeNull()
  })

  it('finds Discord and wiki links in a readme, in order, once each', () => {
    const text = [
      'Rejoignez-nous : discord.gg/PokeFallen !',
      'Wiki : https://pokefallen.fandom.com/wiki/Soluce.',
      'Bugs : https://discord.com/channels/111/222',
      'Encore discord.gg/PokeFallen',
      'Site : https://example.com'
    ].join('\n')
    expect(findLinks(text)).toEqual([
      'https://discord.gg/PokeFallen',
      'https://pokefallen.fandom.com/wiki/Soluce',
      'https://discord.com/channels/111/222'
    ])
  })
})

describe('offli.md', () => {
  it('reads named links of the Liens section, skips template addresses and comments', () => {
    const md = [
      '# Pokémon Decay',
      '- Hors section : https://discord.gg/ignore',
      '## Liens',
      '- Discord : https://discord.gg/decay',
      '- Salon : https://discord.com/channels/XXXX/XXXX',
      '- [Wiki](https://decay.fandom.com/wiki/Accueil)',
      '- Objets: <https://docs.google.com/spreadsheets/d/abc/edit>',
      '- https://example.org',
      '<!-- - Ancien : https://discord.gg/vieux -->',
      '## Notes',
      '- Pas un lien : https://discord.gg/nope'
    ].join('\n')
    expect(parseOffliMd(md)).toEqual([
      { url: 'https://discord.gg/decay', label: 'Discord' },
      { url: 'https://decay.fandom.com/wiki/Accueil', label: 'Wiki' },
      { url: 'https://docs.google.com/spreadsheets/d/abc/edit', label: 'Objets' },
      { url: 'https://example.org/' }
    ])
  })

  it('names a .url shortcut after its file', () => {
    const text = '[InternetShortcut]\r\nURL=https://docs.google.com/spreadsheets/d/x/edit\r\n'
    expect(parseUrlShortcut(text, 'Useful Links - TalemDex.url')).toEqual({
      url: 'https://docs.google.com/spreadsheets/d/x/edit',
      label: 'TalemDex'
    })
    expect(parseUrlShortcut('[InternetShortcut]', 'Vide.url')).toBeNull()
  })
})

describe('journal store', () => {
  it('drops empty notes and bad links, sorts notes newest first', () => {
    const j = cleanJournal({
      notes: [
        { id: 'a', at: 1, text: 'vieux' },
        { id: 'b', at: 5, text: '  récent  ' },
        { id: 'c', at: 3, text: '   ' },
        { at: 4, text: 'sans id' }
      ],
      links: [
        { url: 'discord.gg/x' },
        { url: 'https://discord.gg/x' },
        { url: 'javascript:1' },
        { url: 'wiki.org', label: ' Wiki ' }
      ],
      hiddenLinks: ['https://discord.gg/y', 3]
    })
    expect(j.notes.map((n) => [n.id, n.text])).toEqual([
      ['b', 'récent'],
      ['a', 'vieux']
    ])
    expect(j.links).toEqual([{ url: 'https://discord.gg/x' }, { url: 'https://wiki.org/', label: 'Wiki' }])
    expect(j.hiddenLinks).toEqual(['https://discord.gg/y'])
  })

  it('drops games with nothing left', () => {
    expect(cleanJournals({ a: { notes: [] }, b: { notes: [{ id: 'n', at: 1, text: 'ok' }] } })).toEqual({
      b: { notes: [{ id: 'n', at: 1, text: 'ok' }], links: [], hiddenLinks: [] }
    })
  })

  it('travels in backups; an older backup leaves notes alone', () => {
    const journal = { g: { notes: [{ id: 'n', at: 1, text: 'Badge 3' }], links: [], hiddenLinks: [] } }
    const back = readBackup(JSON.stringify(makeBackup(DEFAULT_SETTINGS, {}, new Date(), journal)), DEFAULT_SETTINGS)!
    expect(back.journal).toEqual(journal)
    const old = { ...makeBackup(DEFAULT_SETTINGS, {}), journal: undefined }
    expect(readBackup(JSON.stringify(old), DEFAULT_SETTINGS)!.journal).toBeUndefined()
  })
})

describe('detectLinks', () => {
  const root = mkdtempSync(join(tmpdir(), 'offli-links-'))
  const game = (p: Partial<Game>): Game =>
    ({ id: 'x', name: 'x', kind: 'fangame', platform: 'pc', path: '', dir: '', ...p }) as Game

  it("reads a fangame's text files, and only a ROM's own files", async () => {
    const fan = join(root, 'PokeFallen')
    mkdirSync(fan)
    writeFileSync(join(fan, 'Lisez-moi.txt'), 'Discord : https://discord.gg/fallen')
    writeFileSync(join(fan, 'Game.exe'), 'discord.gg/binaire')
    writeFileSync(
      join(fan, 'offli.md'),
      '## Liens\n- Wiki : https://fallen.fandom.com/wiki/A\n- Discord : https://discord.gg/fallen'
    )
    writeFileSync(join(fan, 'Useful Links - Items.url'), '[InternetShortcut]\nURL=https://docs.google.com/x')
    const roms = join(root, 'GBA')
    mkdirSync(roms)
    writeFileSync(join(roms, 'Odyssey.gba'), '')
    writeFileSync(join(roms, 'Odyssey - lisez-moi.txt'), 'discord.gg/odyssey')
    writeFileSync(join(roms, 'Autre jeu.txt'), 'discord.gg/autre')

    // offli.md first, so its names win over the same link found elsewhere
    expect(await detectLinks([game({ dir: fan, path: join(fan, 'Game.exe') })])).toEqual([
      { url: 'https://fallen.fandom.com/wiki/A', label: 'Wiki', file: 'offli.md' },
      { url: 'https://discord.gg/fallen', label: 'Discord', file: 'offli.md' },
      { url: 'https://docs.google.com/x', label: 'Items', file: 'Useful Links - Items.url' }
    ])
    expect(
      await detectLinks([game({ kind: 'romhack', platform: 'gba', dir: roms, path: join(roms, 'Odyssey.gba') })])
    ).toEqual([{ url: 'https://discord.gg/odyssey', file: 'Odyssey - lisez-moi.txt' }])
  })
})
