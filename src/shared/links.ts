import type { LinkKind } from './types'

/** Discord invite, channel or wiki, from the URL alone */
export function linkKind(url: string): LinkKind {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return 'site'
  }
  const host = u.hostname.replace(/^www\./, '')
  if (host === 'discord.gg' || (/^discord(app)?\.com$/.test(host) && u.pathname.startsWith('/invite/'))) return 'server'
  if (/^discord(app)?\.com$/.test(host) && u.pathname.startsWith('/channels/')) return 'channel'
  if (/wiki|fandom\.com$|bulbapedia/.test(host + u.pathname.toLowerCase())) return 'wiki'
  return 'site'
}

/** Adds https:// to a bare address; null unless the result is an http(s) URL */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  try {
    const u = new URL(withScheme)
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.') ? u.href : null
  } catch {
    return null
  }
}
