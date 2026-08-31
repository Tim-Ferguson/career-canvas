const explicitScheme = /^[a-z][a-z0-9+.-]*:/i
const hostWithPort = /^[^/?#\s]+:\d+(?:[/?#]|$)/
const confusingCharacters = /[\u0000-\u001f\u007f\s\\\u200e\u200f\u202a-\u202e\u2066-\u2069]/i

function validPublicHostname(hostname: string): boolean {
  const value = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname
  const labels = value.split('.')
  return labels.length >= 2 && labels.every((label) => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))
}

export function externalHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || confusingCharacters.test(trimmed)) return ''
  const hasExplicitScheme = explicitScheme.test(trimmed) && !hostWithPort.test(trimmed)
  if (hasExplicitScheme && !/^https?:/i.test(trimmed)) return ''
  const candidate = trimmed.startsWith('//') ? `https:${trimmed}` : hasExplicitScheme ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(candidate)
    if (!['http:', 'https:'].includes(parsed.protocol) || !validPublicHostname(parsed.hostname) || parsed.username || parsed.password) return ''
    return parsed.href
  } catch {
    return ''
  }
}

export function duplicateExternalLinkIndex(values: string[]): number {
  const seen = new Set<string>()
  for (let index = 0; index < values.length; index += 1) {
    const href = externalHref(values[index] ?? '')
    if (!href) continue
    if (seen.has(href)) return index
    seen.add(href)
  }
  return -1
}

export function emailHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 254 || /[\u0000-\u0020\u007f?#\\\u200e\u200f\u202a-\u202e\u2066-\u2069]/i.test(trimmed)) return ''
  const parts = trimmed.split('@')
  if (parts.length !== 2) return ''
  const [local, domain] = parts
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') || !domain) return ''
  const domainHref = externalHref(domain)
  if (!domainHref) return ''
  const parsedDomain = new URL(domainHref)
  if (parsedDomain.pathname !== '/' || parsedDomain.search || parsedDomain.hash || parsedDomain.port) return ''
  return `mailto:${encodeURIComponent(local)}@${parsedDomain.hostname}`
}

export function phoneHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || /[\u0000-\u001f\u007f]/.test(trimmed)) return ''
  const extensionMatch = trimmed.match(/(?:\s*(?:ext\.?|extension|x)\s*(\d{1,8}))$/i)
  const main = extensionMatch ? trimmed.slice(0, extensionMatch.index).trim() : trimmed
  if (!/^[+\d\s().-]+$/.test(main) || (main.includes('+') && !/^\+[^+]*$/.test(main))) return ''
  const dialableMain = main.startsWith('+') ? main.replace(/\(0\)/g, '') : main
  const digits = dialableMain.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return ''
  return `tel:${main.startsWith('+') ? '+' : ''}${digits}${extensionMatch ? `;ext=${extensionMatch[1]}` : ''}`
}
