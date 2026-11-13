import { MAX_ENTRIES, MAX_LIST_ITEMS, MAX_PROFILE_LINKS, MAX_SECTIONS, MAX_TEXT, createBlankResume, createId, validateResume, type ResumeDocument, type ResumeEntry, type ResumeLink, type ResumeSection, type SectionKind } from './resume'

/**
 * Maps the plain text of an existing resume onto schema v2 without a server or a model.
 * The mapping is rule-based: known section headings, date ranges, bullet glyphs and contact
 * patterns. It is a starting draft, so every line of the source lands somewhere editable
 * instead of being dropped when a rule does not recognize it.
 */

export interface ResumeTextImportOptions {
  /** Shown in the document title, for example "PDF" or "Word". */
  sourceLabel?: string
  /** Link targets the file carried outside its visible text, such as PDF link annotations. */
  links?: readonly string[]
}

export interface ResumeTextImportResult {
  document: ResumeDocument
  warnings: string[]
}

type Bucket = SectionKind | 'summary' | 'contact'

const HEADINGS: Readonly<Record<Bucket, readonly string[]>> = {
  summary: ['summary', 'professional summary', 'executive summary', 'career summary', 'summary of qualifications', 'qualifications summary', 'profile', 'professional profile', 'personal profile', 'about', 'about me', 'objective', 'career objective', 'overview', 'personal statement'],
  contact: ['contact', 'contact information', 'contact info', 'contact details', 'personal details', 'personal information'],
  experience: ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'career history', 'relevant experience', 'professional background', 'internships', 'internship experience', 'military service'],
  education: ['education', 'education and training', 'academic background', 'academic history', 'education and credentials'],
  skills: ['skills', 'technical skills', 'core competencies', 'competencies', 'key skills', 'core skills', 'areas of expertise', 'expertise', 'technologies', 'tools', 'tools and technologies', 'skills and tools', 'skills and expertise', 'skills and technologies', 'programming languages', 'tech stack', 'strengths'],
  projects: ['projects', 'selected projects', 'personal projects', 'side projects', 'key projects', 'open source', 'portfolio'],
  certifications: ['certifications', 'certificates', 'licenses', 'licenses and certifications', 'certifications and licenses', 'credentials', 'licensure', 'training', 'training and certifications', 'professional development', 'courses'],
  volunteering: ['volunteer', 'volunteering', 'volunteer experience', 'volunteer work', 'community service', 'community involvement', 'community and service', 'service', 'leadership and service'],
  awards: ['awards', 'honors', 'honours', 'honors and awards', 'awards and honors', 'awards and recognition', 'achievements', 'recognition', 'accomplishments', 'scholarships', 'fellowships', 'grants'],
  publications: ['publications', 'selected publications', 'presentations', 'publications and presentations', 'talks', 'patents', 'research'],
  languages: ['languages', 'language skills', 'spoken languages'],
  affiliations: ['affiliations', 'professional affiliations', 'memberships', 'professional memberships', 'associations', 'professional associations'],
  interests: ['interests', 'hobbies', 'hobbies and interests', 'interests and hobbies', 'activities', 'personal interests'],
  custom: ['references', 'additional information', 'additional', 'other', 'miscellaneous'],
}

const HEADING_LOOKUP = new Map<string, Bucket>()
const HEADING_LOOKUP_SQUASHED = new Map<string, Bucket>()
for (const [bucket, names] of Object.entries(HEADINGS) as Array<[Bucket, readonly string[]]>) {
  for (const name of names) {
    HEADING_LOOKUP.set(name, bucket)
    HEADING_LOOKUP_SQUASHED.set(name.replaceAll(' ', ''), bucket)
  }
}

/** The last word of a two- or three-word heading such as "Clinical Experience" or "Technical Skills". */
const HEADING_TAIL: Readonly<Record<string, Bucket>> = {
  experience: 'experience', employment: 'experience', history: 'experience',
  education: 'education',
  skills: 'skills', competencies: 'skills', expertise: 'skills', technologies: 'skills', proficiencies: 'skills',
  projects: 'projects',
  certifications: 'certifications', certificates: 'certifications', licenses: 'certifications', credentials: 'certifications',
  awards: 'awards', honors: 'awards', honours: 'awards', achievements: 'awards',
  publications: 'publications', presentations: 'publications',
  affiliations: 'affiliations', memberships: 'affiliations',
  interests: 'interests', hobbies: 'interests',
  summary: 'summary', profile: 'summary', objective: 'summary',
}

const BULLET = /^\s*(?:[•●▪■◦‣⁃∙·○◆◇➢➤►▶✓✔*]|[-–—](?=\s)|o(?=\s+\p{Lu}))\s*/u
const PAGE_MARKER = /^(?:page\s*)?\d{1,2}(?:\s*(?:of|\/)\s*\d{1,2})?$/i

const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?'
const SEASON = '(?:spring|summer|fall|autumn|winter)'
const YEAR = '(?:19|20)\\d{2}'
const DATE = `(?:(?:${MONTH}|${SEASON})\\s*,?\\s*${YEAR}|\\d{1,2}\\s?/\\s?${YEAR}|${YEAR})`
const PRESENT = '(?:present|current|now|today|ongoing|to date)'
const DATE_RANGE = new RegExp(`\\(?(?<![\\w/])(${DATE})\\s*(?:[-–—~]+|to|until|through)\\s*(${DATE}|${PRESENT})(?![\\w/])\\)?`, 'i')
const DATE_SINGLE = new RegExp(`\\(?(?<![\\w/$#.,-])(${DATE})(?![\\w/%-])\\)?`, 'i')
const PRESENT_ONLY = new RegExp(`^${PRESENT}$`, 'i')

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/i
const WEB_ADDRESS = /(?:https?:\/\/|www\.)[^\s|,;()<>]+|\b(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|me|co|ai|app|edu|gov|info|tech|design|page|site|us|uk|ca|de|fr|in|au|nl|se|ch|es|it|ie|nz)\b(?:\/[^\s|,;()<>]*)?/i
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{2,4}[\s.-])\d{3,4}[\s.-]?\d{3,4}(?:\s*(?:x|ext\.?)\s*\d{1,6})?/i

const REGION = '(?:[A-Z]{2}|D\\.C\\.)'
const COUNTRIES = '(?:USA|U\\.S\\.A?\\.?|United States|UK|U\\.K\\.|United Kingdom|England|Scotland|Wales|Canada|Australia|New Zealand|Ireland|Germany|France|Spain|Italy|Portugal|Netherlands|Belgium|Switzerland|Austria|Sweden|Norway|Denmark|Finland|Poland|India|Singapore|Japan|China|Hong Kong|South Korea|Brazil|Mexico|Argentina|Israel|UAE|United Arab Emirates|South Africa|Nigeria|Kenya|Philippines)'
const PLACE = `\\p{Lu}[\\p{L}.'’-]*(?:\\s+\\p{Lu}[\\p{L}.'’-]*){0,3}`
const LOCATION = new RegExp(`^(?:${PLACE},\\s*(?:${REGION}|${COUNTRIES})(?:\\s+\\d{5}(?:-\\d{4})?)?(?:,\\s*${COUNTRIES})?|Remote|Hybrid|On-?site|Remote\\s*\\([^)]*\\))$`, 'u')
const LOCATION_TAIL = new RegExp(`^(.{2,}?)[,\\s]\\s*\\(?(${PLACE},\\s*(?:${REGION}|${COUNTRIES})(?:,\\s*${COUNTRIES})?|Remote)\\)?$`, 'u')
const LOOSE_LOCATION = new RegExp(`^${PLACE},\\s*${PLACE}$`, 'u')

const ROLE_WORD = /\b(?:engineer|developer|manager|director|designer|analyst|architect|consultant|specialist|coordinator|administrator|assistant|associate|intern|officer|president|founder|co-?founder|lead|leader|head|chief|vp|principal|scientist|researcher|nurse|physician|therapist|technician|teacher|professor|lecturer|instructor|tutor|supervisor|representative|executive|strategist|producer|editor|writer|planner|advisor|adviser|accountant|attorney|counsel|paralegal|recruiter|operator|electrician|mechanic|foreman|apprentice|clerk|cashier|server|barista|driver|agent|partner|owner|freelancer|contractor|fellow|resident|pharmacist|programmer|sre|cto|ceo|cfo|coo)\b/i
const ORGANIZATION_WORD = /\b(?:inc|llc|ltd|corp|corporation|company|co|group|university|college|institute|school|academy|hospital|clinic|bank|agency|labs?|studios?|foundation|association|department|district|council|partners|holdings|gmbh|plc|systems|solutions|technologies|services|center|centre)\b\.?/i
const SCHOOL_WORD = /\b(?:university|college|institute|school|academy|polytechnic|conservatory|seminary|universidad|université|universität|bootcamp)\b/i
const DEGREE_WORD = /\b(?:bachelor|bachelors|master|masters|associate|associates|doctor|doctorate|doctoral|diploma|certificate|degree|ged|minor|major|honours|baccalaureate)\b|\b(?:Ph\.?D|B\.?Sc?|B\.?A|M\.?Sc?|M\.?A|M\.?B\.?A|B\.?Eng|M\.?Eng|B\.?F\.?A|M\.?F\.?A|M\.?Ed|J\.?D|M\.?D|B\.?S\.?N|M\.?S\.?N|LL\.?[BM]|A\.?A\.?S?|A\.?S)\b\.?(?!\w)/
const DEGREE_WORD_FLAGS_SAFE = new RegExp(DEGREE_WORD.source.split('|\\b(?:Ph')[0]!, 'i')

const ONE_LINE_KINDS: ReadonlySet<SectionKind> = new Set(['certifications', 'awards', 'affiliations'])

function clean(value: string): string {
  return value.normalize('NFKC').replace(/[​-‍﻿­]/g, '').replace(/[  ]+/g, ' ').trim()
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length
}

function limit(value: string): string {
  return value.length > MAX_TEXT ? value.slice(0, MAX_TEXT) : value
}

function titleCase(value: string): string {
  if (value !== value.toUpperCase() || value === value.toLowerCase()) return value
  return value.toLowerCase().replace(/(^|[\s\-/'’(])(\p{L})/gu, (_match, lead: string, letter: string) => `${lead}${letter.toUpperCase()}`).replace(/\b(And|Of|The|For|In)\b/g, (word, _group, offset: number) => offset === 0 ? word : word.toLowerCase())
}

function isSentence(value: string): boolean {
  const words = wordCount(value)
  return words >= 14 || (words >= 7 && /[.!?]$/.test(value))
}

function stripBullet(value: string): string {
  return value.replace(BULLET, '').trim()
}

function isBullet(value: string): boolean {
  return BULLET.test(value) && stripBullet(value).length > 0
}

/** Returns the section a heading line opens, or null when the line is ordinary content. */
export function resumeHeadingBucket(raw: string): Bucket | null {
  let text = raw.replace(/\t/g, ' ').replace(/^[\s#*_=|~\-–—]+|[\s*_=|~\-–—:：]+$/g, '').trim()
  if (/^(?:\p{L}\s){3,}\p{L}$/u.test(text)) text = text.replaceAll(' ', '')
  if (!text || text.length > 44 || /[\d.;!?@]/.test(text) || !/^\p{Lu}/u.test(text)) return null
  const key = text.toLowerCase().replace(/&|\+|\//g, ' and ').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim()
  const exact = HEADING_LOOKUP.get(key) ?? HEADING_LOOKUP_SQUASHED.get(key.replaceAll(' ', ''))
  if (exact) return exact
  const words = key.split(' ')
  if (words.length < 2 || words.length > 3 || words.some((word) => ['of', 'for', 'in', 'at', 'to'].includes(word))) return null
  // Mixed-case lines must be title case so a job title such as "Skills trainer" stays content.
  if (text !== text.toUpperCase() && text.split(/\s+/).some((word) => /^\p{Ll}/u.test(word) && !['and', '&'].includes(word))) return null
  if (words.includes('volunteer') || words.includes('community')) return 'volunteering'
  return HEADING_TAIL[words.at(-1)!] ?? null
}

interface ParsedDates {
  startDate: string
  endDate: string
  current: boolean
  rest: string
  found: boolean
}

function tidyDate(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\s?\/\s?/, '/').replace(/^\p{Ll}/u, (letter) => letter.toUpperCase()).trim()
}

function tidyRemainder(value: string): string {
  return value.replace(/\(\s*\)/g, ' ').replace(/\s{2,}/g, '\t').replace(/^[\s,;:|·•–—-]+|[\s,;:|·•–—-]+$/g, '').replace(/\t[\s,;:|·•–—-]+/g, '\t').trim()
}

/** Pulls the first date range, or failing that the first single date, out of a line. */
export function extractResumeDates(line: string): ParsedDates {
  const range = DATE_RANGE.exec(line)
  if (range) {
    const current = PRESENT_ONLY.test(range[2]!.trim())
    return { startDate: tidyDate(range[1]!), endDate: current ? '' : tidyDate(range[2]!), current, rest: tidyRemainder(`${line.slice(0, range.index)}\t${line.slice(range.index + range[0].length)}`), found: true }
  }
  const single = DATE_SINGLE.exec(line)
  if (single) return { startDate: '', endDate: tidyDate(single[1]!), current: false, rest: tidyRemainder(`${line.slice(0, single.index)}\t${line.slice(single.index + single[0].length)}`), found: true }
  return { startDate: '', endDate: '', current: false, rest: line.trim(), found: false }
}

function splitPieces(value: string): string[] {
  return value.split(/\t|\s+[|•·●▪■◆]\s+|\s+[–—-]\s+|\s{3,}/).map((piece) => piece.replace(/^[\s,;|]+|[\s,;|]+$/g, '').trim()).filter(Boolean)
}

function splitList(value: string): string[] {
  return value.split(/\t|[,;|•·●▪■◆]|\s{3,}/).map((piece) => piece.replace(/^[\s\-–—]+|[\s.]+$/g, '').trim()).filter(Boolean)
}

function makeEntry(overrides: Partial<ResumeEntry>): ResumeEntry {
  const base: ResumeEntry = { id: createId('entry'), title: '', organization: '', location: '', startDate: '', endDate: '', current: false, url: '', summary: '', highlights: [], keywords: [] }
  const merged = { ...base, ...overrides }
  return {
    ...merged,
    title: limit(merged.title),
    organization: limit(merged.organization),
    location: limit(merged.location),
    summary: limit(merged.summary),
    highlights: merged.highlights.map(limit).filter(Boolean).slice(0, MAX_LIST_ITEMS),
    keywords: merged.keywords.map(limit).filter(Boolean).slice(0, MAX_LIST_ITEMS),
  }
}

interface EntryDraft {
  header: string[]
  summary: string[]
  highlights: string[]
}

function headerToEntry(lines: readonly string[], kind: SectionKind): Partial<ResumeEntry> {
  let dates: ParsedDates | null = null
  const pieces: string[] = []
  let location = ''
  for (const line of lines) {
    const parsed: ParsedDates | null = dates ? null : extractResumeDates(line)
    const text = parsed?.found ? parsed.rest : line
    if (parsed?.found) dates = parsed
    for (let piece of splitPieces(text)) {
      if (!location && LOCATION.test(piece)) { location = piece; continue }
      const tail = location ? null : LOCATION_TAIL.exec(piece)
      if (tail) { piece = tail[1]!.replace(/[\s,(]+$/, ''); location = tail[2]! }
      if (piece) pieces.push(piece)
    }
  }
  if (pieces.length === 1 && kind !== 'education') {
    const joined = /^(.{2,}?)\s+(?:at|@)\s+(\p{Lu}.+)$/u.exec(pieces[0]!)
    if (joined) pieces.splice(0, 1, joined[1]!, joined[2]!)
    else if (ONE_LINE_KINDS.has(kind)) {
      const comma = /^([^,]{2,}),\s+([^,]{2,})$/.exec(pieces[0]!)
      if (comma) pieces.splice(0, 1, comma[1]!, comma[2]!)
    }
  }
  if (pieces.length === 1 && kind === 'education') {
    const parts = pieces[0]!.split(/,\s+/)
    const school = parts.findIndex((part) => SCHOOL_WORD.test(part))
    if (school >= 0 && parts.length > 1) pieces.splice(0, 1, parts[school]!, parts.filter((_part, index) => index !== school).join(', '))
  }
  let title = pieces[0] ?? ''
  let organization = pieces[1] ?? ''
  let extra = pieces.slice(2)
  if (kind === 'education') {
    const school = pieces.findIndex((piece) => SCHOOL_WORD.test(piece))
    const degree = pieces.findIndex((piece, index) => index !== school && (DEGREE_WORD.test(piece) || DEGREE_WORD_FLAGS_SAFE.test(piece)))
    if (school >= 0 || degree >= 0) {
      const schoolIndex = school >= 0 ? school : pieces.findIndex((_piece, index) => index !== degree)
      const degreeIndex = degree >= 0 ? degree : pieces.findIndex((_piece, index) => index !== schoolIndex)
      organization = schoolIndex >= 0 ? pieces[schoolIndex]! : ''
      title = degreeIndex >= 0 ? pieces[degreeIndex]! : ''
      extra = pieces.filter((_piece, index) => index !== schoolIndex && index !== degreeIndex)
    } else {
      title = pieces[1] ?? ''
      organization = pieces[0] ?? ''
    }
  } else if (kind === 'experience' || kind === 'volunteering') {
    const firstIsRole = ROLE_WORD.test(title) && !ORGANIZATION_WORD.test(title)
    const secondIsRole = ROLE_WORD.test(organization) && !ORGANIZATION_WORD.test(organization)
    if (organization && !firstIsRole && secondIsRole) [title, organization] = [organization, title]
  }
  if (!location && extra[0] && LOOSE_LOCATION.test(extra[0]) && !ROLE_WORD.test(extra[0])) location = extra.shift()!
  const singleDateStarts = kind === 'certifications'
  return {
    title,
    organization,
    location,
    startDate: dates ? (dates.startDate || (singleDateStarts ? dates.endDate : '')) : '',
    endDate: dates ? (dates.startDate || !singleDateStarts ? dates.endDate : '') : '',
    current: dates?.current ?? false,
    summary: extra.join(' · '),
  }
}

/** A header block can hold several undated-body entries, such as a compact education list. */
function splitHeaderBlock(lines: readonly string[]): string[][] {
  const dated = lines.map((line, index) => extractResumeDates(line).found ? index : -1).filter((index) => index >= 0)
  if (dated.length < 2) return [[...lines]]
  const groups: string[][] = []
  if (dated[0] === 0) {
    dated.forEach((start, position) => groups.push(lines.slice(start, dated[position + 1] ?? lines.length)))
    return groups
  }
  let from = 0
  dated.forEach((end, position) => {
    groups.push(lines.slice(from, position === dated.length - 1 ? lines.length : end + 1))
    from = end + 1
  })
  return groups
}

function draftToEntries(draft: EntryDraft, kind: SectionKind): ResumeEntry[] {
  const groups = splitHeaderBlock(draft.header)
  return groups.map((group, index) => {
    const last = index === groups.length - 1
    const header = headerToEntry(group, kind)
    return makeEntry({
      ...header,
      summary: [header.summary ?? '', last ? draft.summary.join(' ') : ''].filter(Boolean).join(' '),
      highlights: last ? draft.highlights : [],
    })
  })
}

function joinWrapped(previous: string, next: string): string {
  return /\p{L}-$/u.test(previous) ? `${previous}${next}` : `${previous} ${next}`
}

function timelineEntries(lines: readonly string[], kind: SectionKind): ResumeEntry[] {
  const entries: ResumeEntry[] = []
  let draft: EntryDraft | null = null
  let gap = false
  const flush = () => {
    if (draft && (draft.header.length || draft.summary.length || draft.highlights.length)) entries.push(...draftToEntries(draft, kind))
    draft = null
  }
  const open = (): EntryDraft => (draft ??= { header: [], summary: [], highlights: [] })
  for (const line of lines) {
    if (!line) { gap = true; continue }
    const current: EntryDraft = open()
    const hasBody = current.summary.length > 0 || current.highlights.length > 0
    if (isBullet(line)) {
      current.highlights.push(stripBullet(line))
    } else if (current.highlights.length && !gap && /^\p{Ll}/u.test(line)) {
      current.highlights[current.highlights.length - 1] = joinWrapped(current.highlights.at(-1)!, line)
    } else if (!current.highlights.length && current.header.length && (isSentence(line) || (current.summary.length > 0 && !gap && /^\p{Ll}/u.test(line)))) {
      current.summary.push(line)
    } else if (hasBody || (gap && current.header.some((item) => extractResumeDates(item).found))) {
      flush()
      open().header.push(line)
    } else {
      current.header.push(line)
    }
    gap = false
  }
  flush()
  return entries
}

function oneLineEntries(lines: readonly string[], kind: SectionKind): ResumeEntry[] {
  const items: string[] = []
  for (const line of lines) {
    if (!line) continue
    const dates = extractResumeDates(line)
    if (!isBullet(line) && items.length && (/^\p{Ll}/u.test(line) || /,$/.test(items.at(-1)!) || (dates.found && !dates.rest))) items[items.length - 1] = joinWrapped(items.at(-1)!, line)
    else items.push(stripBullet(line))
  }
  return items.map((item) => makeEntry(headerToEntry([item], kind)))
}

function publicationEntries(lines: readonly string[]): ResumeEntry[] {
  const hasBullets = lines.some(isBullet)
  const hasGaps = lines.some((line, index) => !line && index > 0 && index < lines.length - 1)
  const items: string[] = []
  let gap = true
  for (const line of lines) {
    if (!line) { gap = true; continue }
    const startsItem = hasBullets ? isBullet(line) : hasGaps ? gap : !/^\p{Ll}/u.test(line)
    if (startsItem || !items.length) items.push(stripBullet(line))
    else items[items.length - 1] = joinWrapped(items.at(-1)!, line)
    gap = false
  }
  return items.map((title) => makeEntry({ title }))
}

function skillEntries(lines: readonly string[], fallbackTitle: string): ResumeEntry[] {
  const groups: Array<{ title: string; keywords: string[]; highlights: string[] }> = []
  let continues = false
  for (const raw of lines) {
    if (!raw) { continues = false; continue }
    const line = stripBullet(raw)
    const labelled = /^([^:,;|]{2,48}):\s*(.+)$/.exec(line)
    let group = groups.at(-1)
    if (labelled) {
      group = { title: labelled[1]!.trim(), keywords: [], highlights: [] }
      groups.push(group)
    } else if (!group || (group.title !== fallbackTitle && !continues)) {
      group = groups.find((item) => item.title === fallbackTitle)
      if (!group) { group = { title: fallbackTitle, keywords: [], highlights: [] }; groups.push(group) }
    }
    const text = labelled ? labelled[2]! : line
    if (isSentence(text) && !/[,;|•·]/.test(text.slice(0, 40))) group.highlights.push(text)
    else for (const keyword of splitList(text)) if (!group.keywords.includes(keyword)) group.keywords.push(keyword)
    continues = /[,;|•·]\s*$/.test(raw)
  }
  return groups.filter((group) => group.keywords.length || group.highlights.length).map((group) => makeEntry(group))
}

function languageEntries(lines: readonly string[]): ResumeEntry[] {
  return lines.filter(Boolean).flatMap((line) => stripBullet(line).split(/\t|[,;|•·]|\s{3,}/)).map((item) => item.trim()).filter(Boolean).map((item) => {
    const parts = /^([^(:–—-]+?)\s*(?:[:–—-]\s*|\(\s*)([^)]+)\)?$/.exec(item)
    return makeEntry(parts ? { title: parts[1]!.trim(), organization: parts[2]!.trim() } : { title: item })
  })
}

function interestEntries(lines: readonly string[], title: string): ResumeEntry[] {
  const content = lines.filter(Boolean).map(stripBullet)
  if (!content.length) return []
  if (content.some(isSentence)) return [makeEntry({ title, summary: content.join(' ') })]
  return [makeEntry({ title, keywords: [...new Set(content.flatMap(splitList))] })]
}

function sectionEntries(kind: SectionKind, title: string, lines: readonly string[]): ResumeEntry[] {
  if (kind === 'skills') return skillEntries(lines, title)
  if (kind === 'languages') return languageEntries(lines)
  if (kind === 'interests') return interestEntries(lines, title)
  if (kind === 'publications') return publicationEntries(lines)
  if (ONE_LINE_KINDS.has(kind)) {
    const content = lines.filter(Boolean)
    const startsWithBullet = content[0] !== undefined && isBullet(content[0])
    const blocks = lines.join('\n').split(/\n{2,}/).filter((block) => block.trim())
    const multiLineBlocks = blocks.length > 1 && blocks.some((block) => block.includes('\n'))
    if (startsWithBullet || (!content.some(isBullet) && !multiLineBlocks)) return oneLineEntries(lines, kind)
  }
  return timelineEntries(lines, kind)
}

interface ContactDraft {
  name: string
  headline: string
  email: string
  phone: string
  location: string
  website: string
  links: ResumeLink[]
  leftovers: string[]
}

function looksLikeName(value: string): boolean {
  const words = value.split(/\s+/)
  if (words.length < 2 || words.length > 5 || value.length > 60 || /[\d@/:|]/.test(value)) return false
  if (/^(?:resume|résumé|curriculum vitae|cv)$/i.test(value) || resumeHeadingBucket(value)) return false
  return words.every((word) => /^\p{Lu}/u.test(word) || /^(?:de|del|della|da|dos|van|von|der|den|la|le|bin|al|el|y)$/i.test(word))
}

function addWebAddress(contact: ContactDraft, raw: string): void {
  const url = raw.replace(/[.,;:)\]]+$/, '')
  const bare = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '').toLowerCase()
  const known = [contact.website, ...contact.links.map((link) => link.url)].map((item) => item.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '').toLowerCase())
  if (!bare || known.includes(bare)) return
  const label = /(^|\.)linkedin\.com\//.test(bare) ? 'LinkedIn' : /(^|\.)github\.com\//.test(bare) ? 'GitHub' : ''
  if (!label && !contact.website) { contact.website = url; return }
  if (contact.links.length < MAX_PROFILE_LINKS) contact.links.push({ id: createId('link'), label: label || bare.split('/')[0]!, url })
}

function readContactLine(contact: ContactDraft, source: string, allowProse: boolean): void {
  let line = source
  const take = (pattern: RegExp, use: (match: string) => void) => {
    for (let match = pattern.exec(line); match; match = pattern.exec(line)) {
      use(match[0])
      line = `${line.slice(0, match.index)}\t${line.slice(match.index + match[0].length)}`
    }
  }
  take(EMAIL, (match) => { if (!contact.email) contact.email = match })
  take(WEB_ADDRESS, (match) => addWebAddress(contact, match))
  take(PHONE, (match) => { if (!contact.phone && match.replace(/\D/g, '').length >= 9) contact.phone = match.trim() })
  const hadContact = line !== source
  for (const part of line.split(/\t|\s+[|•·●▪■◆]\s+|\s+[–—]\s+|\s{3,}/)) {
    const piece = part.replace(/^(?:e-?mail|phone|mobile|cell|tel|telephone|address|location|linkedin|github|website|portfolio|web)\s*:?\s*$/i, '').replace(/^(?:address|location)\s*:\s*/i, '').replace(/^[\s,;:|()\-–—]+|[\s,;:|(\-–—]+$/g, '').trim()
    if (!/[\p{L}\p{N}]/u.test(piece) || PAGE_MARKER.test(piece) || /^(?:resume|résumé|curriculum vitae|cv)$/i.test(piece)) continue
    if (!contact.location && LOCATION.test(piece)) contact.location = piece
    else if (!contact.name && looksLikeName(piece)) contact.name = titleCase(piece)
    else if (!contact.location && (contact.name || hadContact) && LOOSE_LOCATION.test(piece) && wordCount(piece) <= 5 && !ROLE_WORD.test(piece)) contact.location = piece
    else if (!contact.headline && contact.name && !isSentence(piece) && wordCount(piece) <= 12 && !/\d{3}/.test(piece)) contact.headline = titleCase(piece)
    else if (allowProse) contact.leftovers.push(piece)
  }
}

function addCarriedLink(contact: ContactDraft, target: string): void {
  const mail = /^mailto:([^?]+)/i.exec(target)
  if (mail) { if (!contact.email && EMAIL.test(mail[1]!)) contact.email = decodeURIComponent(mail[1]!); return }
  if (/^https?:\/\/(?:[a-z]+\.)?linkedin\.com\/(?:in|pub)\/[^/?#]+/i.test(target) || /^https?:\/\/(?:www\.)?github\.com\/[^/?#]+\/?$/i.test(target)) addWebAddress(contact, target)
}

/** Converts the text lines of a resume into a strict schema v2 document. An empty string marks a paragraph gap. */
export function importResumeText(source: readonly string[], options: ResumeTextImportOptions = {}): ResumeTextImportResult {
  const lines = source.flatMap((line) => line.split(/\r?\n/)).map((line) => line.split('\t').map(clean).join('\t').replace(/^\t+|\t+$/g, '')).filter((line) => !PAGE_MARKER.test(line))
  while (lines.length && !lines[0]) lines.shift()
  if (!lines.some(Boolean)) throw new Error('No readable text was found in this file.')

  const blocks: Array<{ bucket: Bucket | 'preamble'; title: string; lines: string[] }> = [{ bucket: 'preamble', title: '', lines: [] }]
  for (const line of lines) {
    const bucket = line && !isBullet(line) ? resumeHeadingBucket(line) : null
    if (bucket) blocks.push({ bucket, title: titleCase(line.replace(/\t/g, ' ').replace(/^[\s#*_=|~\-–—]+|[\s*_=|~\-–—:：]+$/g, '').replace(/^(?:\p{L}\s){3,}\p{L}$/u, (spaced) => spaced.replaceAll(' ', ''))), lines: [] })
    else blocks.at(-1)!.lines.push(line)
  }

  const warnings: string[] = []
  const foundHeadings = blocks.length > 1
  if (!foundHeadings) {
    const preamble = blocks[0]!.lines
    const firstGap = preamble.findIndex((line, index) => !line && index > 0)
    const cut = Math.min(firstGap > 0 ? firstGap : preamble.length, 8)
    blocks.push({ bucket: 'custom', title: 'Imported content', lines: preamble.splice(cut) })
    warnings.push('No familiar section headings such as Experience or Education were found, so the body was kept together under “Imported content” for you to sort.')
  }

  const contact: ContactDraft = { name: '', headline: '', email: '', phone: '', location: '', website: '', links: [], leftovers: [] }
  for (const line of blocks[0]!.lines) if (line) readContactLine(contact, stripBullet(line), true)
  const summaryLines: string[] = []
  const sections: ResumeSection[] = []
  let droppedSections = 0
  for (const block of blocks.slice(1)) {
    if (block.bucket === 'contact') {
      for (const line of block.lines) if (line) readContactLine(contact, stripBullet(line), false)
    } else if (block.bucket === 'summary') {
      summaryLines.push(...block.lines.filter(Boolean).map(stripBullet))
    } else if (block.bucket !== 'preamble') {
      const entries = sectionEntries(block.bucket, block.title, block.lines).slice(0, MAX_ENTRIES)
      if (!entries.length) continue
      const existing = sections.find((item) => item.kind === block.bucket && item.title.toLowerCase() === block.title.toLowerCase())
      if (existing) existing.entries = [...existing.entries, ...entries].slice(0, MAX_ENTRIES)
      else if (sections.length < MAX_SECTIONS) sections.push({ id: createId(block.bucket), kind: block.bucket, title: limit(block.title), visible: true, entries })
      else droppedSections += 1
    }
  }
  for (const link of options.links ?? []) addCarriedLink(contact, link)

  const summary = [...summaryLines, ...(summaryLines.length ? [] : contact.leftovers)].reduce((text, line) => text ? joinWrapped(text, line) : line, '')
  if (summaryLines.length && contact.leftovers.length) {
    warnings.push(`Text above the first heading that was not a name or contact detail was skipped: “${contact.leftovers.join(' ').slice(0, 120)}”.`)
  }
  if (!contact.name) warnings.push('No name was recognized at the top of the file. Add it in the Profile card.')
  if (!contact.email && !contact.phone) warnings.push('No email address or phone number was recognized.')
  if (foundHeadings && !sections.some((item) => item.kind === 'experience')) warnings.push('No work experience heading was recognized. Check that roles did not land in another section.')
  if (droppedSections) warnings.push(`${droppedSections} sections beyond the ${MAX_SECTIONS}-section limit were not imported.`)

  const base = createBlankResume()
  const document = validateResume({
    ...base,
    title: `${contact.name || 'Imported resume'} — from ${options.sourceLabel || 'text'}`,
    targetRole: limit(contact.headline),
    profile: {
      name: limit(contact.name),
      headline: limit(contact.headline),
      email: contact.email,
      phone: contact.phone,
      location: limit(contact.location),
      website: limit(contact.website),
      summary: limit(summary),
      links: contact.links,
    },
    sections,
  })
  return { document, warnings }
}
