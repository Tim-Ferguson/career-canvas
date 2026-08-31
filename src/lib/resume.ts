import { z } from 'zod'
import { resumeDateIsDefinitelyFuture, resumeDateRangeIsReversed } from './dateIntegrity'
import { duplicateExternalLinkIndex, emailHref, externalHref, phoneHref } from './contactLinks'

export const MAX_DOCUMENT_BYTES = 2_000_000
export const MAX_RESUMES = 24
export const MAX_TEXT = 20_000
export const MAX_SECTIONS = 32
export const MAX_ENTRIES = 200
export const MAX_LIST_ITEMS = 100
export const MAX_PROFILE_LINKS = 24

export const sectionKinds = [
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'volunteering',
  'awards',
  'publications',
  'languages',
  'affiliations',
  'interests',
  'custom',
] as const

export const layouts = ['modern', 'classic', 'executive', 'compact', 'minimal', 'academic'] as const
export const pageSizes = ['letter', 'a4'] as const
export const fontPairs = ['sans', 'serif', 'editorial'] as const
export const densities = ['comfortable', 'balanced', 'tight'] as const

const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'must be a portable identifier')
const textSchema = z.string().max(MAX_TEXT)
const textListSchema = z.array(textSchema).max(MAX_LIST_ITEMS)

const linkSchema = z.object({
  id: idSchema,
  label: textSchema,
  url: textSchema,
}).strict()

const profileSchema = z.object({
  name: textSchema,
  headline: textSchema,
  email: textSchema,
  phone: textSchema,
  location: textSchema,
  website: textSchema,
  summary: textSchema,
  links: z.array(linkSchema).max(MAX_PROFILE_LINKS),
}).strict()

const entrySchema = z.object({
  id: idSchema,
  title: textSchema,
  organization: textSchema,
  location: textSchema,
  startDate: textSchema,
  endDate: textSchema,
  current: z.boolean(),
  url: textSchema,
  summary: textSchema,
  highlights: textListSchema,
  keywords: textListSchema,
}).strict()

const sectionSchema = z.object({
  id: idSchema,
  kind: z.enum(sectionKinds),
  title: textSchema,
  visible: z.boolean(),
  entries: z.array(entrySchema).max(MAX_ENTRIES),
}).strict()

const settingsSchema = z.object({
  layout: z.enum(layouts),
  pageSize: z.enum(pageSizes),
  fontPair: z.enum(fontPairs),
  density: z.enum(densities),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a six-digit hex color'),
}).strict()

export const resumeSchema = z.object({
  schemaVersion: z.literal(2),
  id: idSchema,
  title: textSchema,
  targetRole: textSchema,
  industry: textSchema,
  updatedAt: textSchema,
  profile: profileSchema,
  settings: settingsSchema,
  sections: z.array(sectionSchema).max(MAX_SECTIONS),
}).strict()

export type ResumeDocument = z.infer<typeof resumeSchema>
export type ResumeProfile = ResumeDocument['profile']
export type ResumeSection = ResumeDocument['sections'][number]
export type ResumeEntry = ResumeSection['entries'][number]
export type ResumeLink = ResumeProfile['links'][number]
export type SectionKind = (typeof sectionKinds)[number]
export type Layout = (typeof layouts)[number]
export type PageSize = (typeof pageSizes)[number]
export type FontPair = (typeof fontPairs)[number]
export type Density = (typeof densities)[number]

export interface ResumeLibrary {
  activeId: string
  documents: ResumeDocument[]
}

export interface ResumeIssue {
  id: string
  severity: 'essential' | 'improvement' | 'tip'
  title: string
  detail: string
  sectionId?: string
  entryId?: string
}

export interface ResumeAnalysis {
  score: number
  issues: ResumeIssue[]
  words: number
  bullets: number
  estimatedPages: number
}

export interface StarterDefinition {
  id: StarterId
  label: string
  eyebrow: string
  description: string
}

export type StarterId = 'universal' | 'leadership' | 'healthcare' | 'education' | 'creative' | 'trades' | 'student' | 'public_service' | 'career_change' | 'academic'

export interface EntryDatePresentation {
  startLabel: string
  startPlaceholder: string
  endLabel: string
  endPlaceholder: string
  currentLabel: string
  currentText: string
  optional: boolean
}

export const STARTERS: readonly StarterDefinition[] = [
  { id: 'universal', label: 'Universal', eyebrow: 'Balanced', description: 'A flexible, ATS-friendly starting point for most experienced professionals.' },
  { id: 'leadership', label: 'Leadership', eyebrow: 'Executive', description: 'Prioritizes scope, business outcomes, transformation, and board-ready clarity.' },
  { id: 'healthcare', label: 'Healthcare', eyebrow: 'Clinical', description: 'Makes licenses, clinical settings, patient impact, and credentials easy to scan.' },
  { id: 'education', label: 'Education', eyebrow: 'Teaching', description: 'Balances instruction, curriculum, learner outcomes, service, and credentials.' },
  { id: 'creative', label: 'Creative', eyebrow: 'Portfolio', description: 'Pairs selected work and portfolio links with measurable commercial outcomes.' },
  { id: 'trades', label: 'Skilled trades', eyebrow: 'Hands-on', description: 'Highlights certifications, safety, equipment, project scope, and reliability.' },
  { id: 'student', label: 'Student', eyebrow: 'Early career', description: 'Leads with education, relevant projects, capabilities, and transferable experience.' },
  { id: 'public_service', label: 'Public service', eyebrow: 'Stewardship', description: 'Emphasizes public outcomes, accountability, and trust; verify jurisdiction-specific application rules.' },
  { id: 'career_change', label: 'Career change', eyebrow: 'Transferable', description: 'Connects proven capabilities to a new target without hiding work chronology.' },
  { id: 'academic', label: 'Academic', eyebrow: 'Research', description: 'Supports publications, research, teaching, awards, and professional affiliations.' },
] as const

export const SECTION_CATALOG: ReadonlyArray<{ kind: SectionKind; title: string; description: string }> = [
  { kind: 'experience', title: 'Experience', description: 'Roles, consulting, military service, or relevant employment' },
  { kind: 'education', title: 'Education', description: 'Degrees, apprenticeships, training, and continuing education' },
  { kind: 'skills', title: 'Skills', description: 'Capabilities, tools, methods, equipment, or specialties' },
  { kind: 'projects', title: 'Projects', description: 'Selected work, case studies, productions, or implementations' },
  { kind: 'certifications', title: 'Licenses & certifications', description: 'Licensure, credentials, clearances, and formal qualifications' },
  { kind: 'volunteering', title: 'Community & service', description: 'Volunteer work, committees, and civic leadership' },
  { kind: 'awards', title: 'Awards & honors', description: 'Recognition, grants, scholarships, and distinctions' },
  { kind: 'publications', title: 'Publications', description: 'Research, articles, presentations, patents, and media' },
  { kind: 'languages', title: 'Languages', description: 'Languages and proficiency levels' },
  { kind: 'affiliations', title: 'Professional affiliations', description: 'Associations, boards, unions, and memberships' },
  { kind: 'interests', title: 'Interests', description: 'Optional interests that add useful, relevant context' },
  { kind: 'custom', title: 'Custom section', description: 'Anything your field or story needs' },
]

export const ENTRY_DATE_PRESENTATION: Readonly<Record<SectionKind, EntryDatePresentation>> = {
  experience: { startLabel: 'Start', startPlaceholder: '2022 or Sep 2022', endLabel: 'End', endPlaceholder: '2025', currentLabel: 'Current role or position', currentText: 'Present', optional: false },
  education: { startLabel: 'Started', startPlaceholder: '2022', endLabel: 'Completed or expected', endPlaceholder: 'May 2026 or Expected 2027', currentLabel: 'Program is in progress', currentText: 'In progress', optional: false },
  skills: { startLabel: 'First used', startPlaceholder: '2020', endLabel: 'Last used', endPlaceholder: '2025', currentLabel: 'Currently used', currentText: 'Current', optional: true },
  projects: { startLabel: 'Started', startPlaceholder: '2024', endLabel: 'Completed', endPlaceholder: '2025', currentLabel: 'Project is ongoing', currentText: 'Ongoing', optional: false },
  certifications: { startLabel: 'Issued', startPlaceholder: 'May 2024', endLabel: 'Expires, renewed, or status', endPlaceholder: 'May 2026 or Active', currentLabel: 'Active with no listed end date', currentText: 'Active', optional: false },
  volunteering: { startLabel: 'Start', startPlaceholder: '2022', endLabel: 'End', endPlaceholder: '2025', currentLabel: 'Service is ongoing', currentText: 'Present', optional: false },
  awards: { startLabel: 'Awarded or started', startPlaceholder: '2024', endLabel: 'Ended (for grants)', endPlaceholder: '2025', currentLabel: 'Award or grant is ongoing', currentText: 'Ongoing', optional: false },
  publications: { startLabel: 'Work began (optional)', startPlaceholder: '2023', endLabel: 'Published or presented', endPlaceholder: '2025', currentLabel: 'Forthcoming or in press', currentText: 'Forthcoming', optional: false },
  languages: { startLabel: 'First used', startPlaceholder: '2018', endLabel: 'Last used', endPlaceholder: '2025', currentLabel: 'Currently used', currentText: 'Current', optional: true },
  affiliations: { startLabel: 'Joined', startPlaceholder: '2022', endLabel: 'Ended', endPlaceholder: '2025', currentLabel: 'Membership or service is current', currentText: 'Present', optional: false },
  interests: { startLabel: 'Started', startPlaceholder: '2020', endLabel: 'Ended', endPlaceholder: '2025', currentLabel: 'Currently active', currentText: 'Current', optional: true },
  custom: { startLabel: 'Start', startPlaceholder: '2022', endLabel: 'End', endPlaceholder: '2025', currentLabel: 'Current or ongoing', currentText: 'Present', optional: false },
}

export function formatEntryDateRange(entry: ResumeEntry, kind: SectionKind): string {
  return [entry.startDate, entry.current ? ENTRY_DATE_PRESENTATION[kind].currentText : entry.endDate].filter((value) => value.trim()).join(' – ')
}

export function entryHasRenderableContent(entry: ResumeEntry): boolean {
  return [entry.title, entry.organization, entry.url, entry.summary, ...entry.highlights, ...entry.keywords].some((value) => value.trim())
}

export function sectionHasRenderableContent(section: ResumeSection): boolean {
  return section.entries.some(entryHasRenderableContent)
}

const actionVerbs = new Set([
  'accelerated', 'achieved', 'built', 'coached', 'created', 'cut', 'delivered', 'designed', 'developed', 'directed',
  'drove', 'established', 'expanded', 'grew', 'implemented', 'improved', 'increased', 'launched', 'led', 'managed',
  'negotiated', 'operated', 'optimized', 'produced', 'reduced', 'resolved', 'scaled', 'secured', 'streamlined', 'trained',
])

function now(): string {
  return new Date().toISOString()
}

export function createId(prefix: string): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replaceAll('-', '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14)
  return `${prefix}-${token}`
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

export function parseJsonText(value: string): unknown {
  return JSON.parse(value.replace(/^\uFEFF/, '')) as unknown
}

export function parseResumeJson(value: string): ResumeDocument {
  if (utf8ByteLength(value) > MAX_DOCUMENT_BYTES) throw new Error('Resume JSON is larger than the 2 MB safety limit.')
  return migrateResume(parseJsonText(value))
}

export type ResumeImportFormat = 'career-canvas-v2' | 'career-canvas-v1' | 'json-resume'

export interface ResumeImportResult {
  document: ResumeDocument
  format: ResumeImportFormat
  warnings: string[]
}

export function parseResumeImportJson(value: string): ResumeImportResult {
  if (utf8ByteLength(value) > MAX_DOCUMENT_BYTES) throw new Error('Resume JSON is larger than the 2 MB safety limit.')
  const source = parseJsonText(value)
  if (!isRecord(source)) throw new Error('Resume must be an object.')
  const format: ResumeImportFormat = source.schemaVersion === 2 ? 'career-canvas-v2' : source.schemaVersion === 1 ? 'career-canvas-v1' : isJsonResume(source) ? 'json-resume' : (() => { throw new Error('Unsupported resume schema. Expected Career Canvas version 1 or 2, or a JSON Resume document.') })()
  const warnings: string[] = []
  if (format === 'json-resume') {
    if (isRecord(source.basics) && jsonString(source.basics, 'image', 'basics')) warnings.push('The JSON Resume profile image was not imported; Career Canvas layouts are intentionally photo-free.')
    if (source.meta !== undefined) warnings.push('JSON Resume registry metadata is not rendered; only a valid last-modified time is retained.')
    const standardKeys = new Set(['$schema', 'basics', 'work', 'volunteer', 'education', 'awards', 'certificates', 'publications', 'skills', 'languages', 'interests', 'references', 'projects', 'meta', 'x-career-canvas'])
    if (Object.keys(source).some((key) => !standardKeys.has(key))) warnings.push('Custom root extension fields were not imported; verify the converted resume against the source.')
  }
  return { document: migrateResume(source), format, warnings }
}

function assertDocumentSize(value: unknown): void {
  let json: string
  try {
    json = JSON.stringify(value)
  } catch {
    throw new Error('Resume must be JSON-serializable.')
  }
  if (json === undefined) throw new Error('Resume must be JSON-serializable.')
  if (utf8ByteLength(json) > MAX_DOCUMENT_BYTES) throw new Error('Resume is larger than the 2 MB safety limit.')
}

function formatZodError(error: z.ZodError): string {
  const first = error.issues[0]
  if (!first) return 'Resume data is invalid.'
  const path = first.path.length ? first.path.join('.') : 'resume'
  return `${path}: ${first.message}`
}

export function validateResume(value: unknown): ResumeDocument {
  assertDocumentSize(value)
  const parsed = resumeSchema.safeParse(value)
  if (!parsed.success) throw new Error(formatZodError(parsed.error))
  const sectionIds = parsed.data.sections.map((section) => section.id)
  if (new Set(sectionIds).size !== sectionIds.length) throw new Error('Section IDs must be unique.')
  const entryIds = parsed.data.sections.flatMap((section) => section.entries.map((entry) => entry.id))
  if (new Set(entryIds).size !== entryIds.length) throw new Error('Entry IDs must be unique across the document.')
  const linkIds = parsed.data.profile.links.map((link) => link.id)
  if (new Set(linkIds).size !== linkIds.length) throw new Error('Profile link IDs must be unique.')
  return parsed.data
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function oldString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function jsonString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key]
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw new Error(`JSON Resume ${context}.${key} must be text.`)
  return value
}

function jsonRecords(source: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = source[key]
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error(`JSON Resume ${key} must be a list.`)
  if (value.length > MAX_ENTRIES) throw new Error(`JSON Resume ${key} can contain at most ${MAX_ENTRIES} entries.`)
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`JSON Resume ${key}[${index}] must be an object.`)
    return item
  })
}

function jsonStrings(record: Record<string, unknown>, key: string, context: string): string[] {
  const value = record[key]
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error(`JSON Resume ${context}.${key} must be a list.`)
  if (value.length > MAX_LIST_ITEMS) throw new Error(`JSON Resume ${context}.${key} can contain at most ${MAX_LIST_ITEMS} items.`)
  return value.map((item, index) => {
    if (typeof item !== 'string') throw new Error(`JSON Resume ${context}.${key}[${index}] must be text.`)
    return item
  })
}

function jsonBoolean(record: Record<string, unknown>, key: string, context: string): boolean | undefined {
  const value = record[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'boolean') throw new Error(`JSON Resume ${context}.${key} must be true or false.`)
  return value
}

function combinedText(...values: string[]): string {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].join('\n\n')
}

function isJsonResume(value: Record<string, unknown>): boolean {
  if (typeof value.$schema === 'string' && value.$schema.toLocaleLowerCase().includes('jsonresume')) return true
  return isRecord(value.basics) || ['work', 'volunteer', 'education', 'awards', 'certificates', 'publications', 'skills', 'languages', 'interests', 'references', 'projects'].some((key) => Array.isArray(value[key]))
}

function migrateJsonResume(value: Record<string, unknown>): ResumeDocument {
  const basics = value.basics === undefined || value.basics === null ? {} : isRecord(value.basics) ? value.basics : (() => { throw new Error('JSON Resume basics must be an object.') })()
  const locationRecord = basics.location === undefined || basics.location === null ? {} : isRecord(basics.location) ? basics.location : (() => { throw new Error('JSON Resume basics.location must be an object.') })()
  const location = ['address', 'postalCode', 'city', 'region', 'countryCode'].map((key) => jsonString(locationRecord, key, 'basics.location')).filter((item, index, items) => item.trim() && items.indexOf(item) === index).join(', ')
  const profiles = (() => {
    const raw = basics.profiles
    if (raw === undefined || raw === null) return []
    if (!Array.isArray(raw)) throw new Error('JSON Resume basics.profiles must be a list.')
    if (raw.length > MAX_PROFILE_LINKS) throw new Error(`JSON Resume basics.profiles can contain at most ${MAX_PROFILE_LINKS} items.`)
    return raw.map((item, index) => {
      if (!isRecord(item)) throw new Error(`JSON Resume basics.profiles[${index}] must be an object.`)
      const network = jsonString(item, 'network', `basics.profiles[${index}]`)
      const username = jsonString(item, 'username', `basics.profiles[${index}]`)
      return { id: createId('link'), label: network || username || 'Profile', url: jsonString(item, 'url', `basics.profiles[${index}]`) }
    })
  })()

  const makeTimelineEntry = (raw: Record<string, unknown>, context: string, fields: { title: string; organization: string; location?: string; summary?: string; url?: string; highlights?: string; keywords?: string }): ResumeEntry => {
    const startDate = jsonString(raw, 'startDate', context)
    const endDate = jsonString(raw, 'endDate', context)
    return entry({
      title: jsonString(raw, fields.title, context),
      organization: jsonString(raw, fields.organization, context),
      location: fields.location ? jsonString(raw, fields.location, context) : '',
      startDate,
      endDate,
      current: jsonBoolean(raw, 'current', context) ?? Boolean(startDate.trim() && !endDate.trim()),
      url: fields.url ? jsonString(raw, fields.url, context) : '',
      summary: fields.summary ? jsonString(raw, fields.summary, context) : '',
      highlights: fields.highlights ? jsonStrings(raw, fields.highlights, context) : [],
      keywords: fields.keywords ? jsonStrings(raw, fields.keywords, context) : [],
    })
  }

  const sections: ResumeSection[] = []
  const addSection = (kind: SectionKind, title: string, entries: ResumeEntry[]) => { if (entries.length) sections.push(section(kind, title, entries)) }
  addSection('experience', 'Experience', jsonRecords(value, 'work').map((raw, index) => {
    const item = makeTimelineEntry(raw, `work[${index}]`, { title: 'position', organization: 'name', location: 'location', summary: 'summary', url: 'url', highlights: 'highlights', keywords: 'keywords' })
    return { ...item, summary: combinedText(jsonString(raw, 'description', `work[${index}]`), item.summary) }
  }))
  addSection('volunteering', 'Community & service', jsonRecords(value, 'volunteer').map((raw, index) => makeTimelineEntry(raw, `volunteer[${index}]`, { title: 'position', organization: 'organization', location: 'location', summary: 'summary', url: 'url', highlights: 'highlights', keywords: 'keywords' })))
  addSection('education', 'Education', jsonRecords(value, 'education').map((raw, index) => {
    const context = `education[${index}]`
    const studyType = jsonString(raw, 'studyType', context)
    const area = jsonString(raw, 'area', context)
    const item = makeTimelineEntry(raw, context, { title: 'studyType', organization: 'institution', location: 'location', summary: 'summary', url: 'url', highlights: 'highlights', keywords: 'keywords' })
    const score = jsonString(raw, 'score', context)
    const courses = jsonStrings(raw, 'courses', context)
    return { ...item, title: [studyType, area].filter(Boolean).join(', '), highlights: [...item.highlights, score ? `Score: ${score}` : '', ...courses.map((course) => `Course: ${course}`)].filter(Boolean) }
  }))
  addSection('projects', 'Projects', jsonRecords(value, 'projects').map((raw, index) => {
    const context = `projects[${index}]`
    const item = makeTimelineEntry(raw, context, { title: 'name', organization: 'entity', summary: 'description', url: 'url', highlights: 'highlights', keywords: 'keywords' })
    const roles = jsonStrings(raw, 'roles', context)
    const type = jsonString(raw, 'type', context)
    return { ...item, organization: item.organization || roles.join(', ') || type, keywords: [...item.keywords, ...roles.filter((role) => !item.keywords.includes(role))] }
  }))
  addSection('certifications', 'Licenses & certifications', jsonRecords(value, 'certificates').map((raw, index) => {
    const context = `certificates[${index}]`
    return entry({ title: jsonString(raw, 'name', context), organization: jsonString(raw, 'issuer', context), location: jsonString(raw, 'location', context), startDate: jsonString(raw, 'date', context) || jsonString(raw, 'startDate', context), endDate: jsonString(raw, 'endDate', context), current: jsonBoolean(raw, 'current', context) ?? false, url: jsonString(raw, 'url', context), summary: jsonString(raw, 'summary', context), highlights: jsonStrings(raw, 'highlights', context), keywords: jsonStrings(raw, 'keywords', context) })
  }))
  addSection('awards', 'Awards & honors', jsonRecords(value, 'awards').map((raw, index) => {
    const context = `awards[${index}]`
    return entry({ title: jsonString(raw, 'title', context), organization: jsonString(raw, 'awarder', context), location: jsonString(raw, 'location', context), startDate: jsonString(raw, 'startDate', context), endDate: jsonString(raw, 'date', context), current: jsonBoolean(raw, 'current', context) ?? false, url: jsonString(raw, 'url', context), summary: jsonString(raw, 'summary', context), highlights: jsonStrings(raw, 'highlights', context), keywords: jsonStrings(raw, 'keywords', context) })
  }))
  addSection('publications', 'Publications', jsonRecords(value, 'publications').map((raw, index) => {
    const context = `publications[${index}]`
    return entry({ title: jsonString(raw, 'name', context), organization: jsonString(raw, 'publisher', context), location: jsonString(raw, 'location', context), startDate: jsonString(raw, 'startDate', context), endDate: jsonString(raw, 'releaseDate', context), current: jsonBoolean(raw, 'current', context) ?? false, url: jsonString(raw, 'url', context), summary: jsonString(raw, 'summary', context), highlights: jsonStrings(raw, 'highlights', context), keywords: jsonStrings(raw, 'keywords', context) })
  }))
  addSection('skills', 'Skills', jsonRecords(value, 'skills').map((raw, index) => {
    const context = `skills[${index}]`
    return makeTimelineEntry(raw, context, { title: 'name', organization: 'level', location: 'location', summary: 'summary', url: 'url', highlights: 'highlights', keywords: 'keywords' })
  }))
  addSection('languages', 'Languages', jsonRecords(value, 'languages').map((raw, index) => {
    const context = `languages[${index}]`
    return makeTimelineEntry(raw, context, { title: 'language', organization: 'fluency', location: 'location', summary: 'summary', url: 'url', highlights: 'highlights', keywords: 'keywords' })
  }))
  addSection('interests', 'Interests', jsonRecords(value, 'interests').map((raw, index) => {
    const context = `interests[${index}]`
    return makeTimelineEntry(raw, context, { title: 'name', organization: 'organization', location: 'location', summary: 'summary', url: 'url', highlights: 'highlights', keywords: 'keywords' })
  }))
  addSection('custom', 'References', jsonRecords(value, 'references').map((raw, index) => {
    const context = `references[${index}]`
    return entry({ title: jsonString(raw, 'name', context) || 'Reference', summary: jsonString(raw, 'reference', context) })
  }))

  const extension = value['x-career-canvas'] === undefined || value['x-career-canvas'] === null ? null : isRecord(value['x-career-canvas']) ? value['x-career-canvas'] : (() => { throw new Error('JSON Resume x-career-canvas extension must be an object.') })()
  let extensionTitle = ''
  let extensionTarget = ''
  let extensionIndustry = ''
  let extensionSettings: ResumeDocument['settings'] | null = null
  if (extension) {
    extensionTitle = jsonString(extension, 'title', 'x-career-canvas')
    extensionTarget = jsonString(extension, 'targetRole', 'x-career-canvas')
    extensionIndustry = jsonString(extension, 'industry', 'x-career-canvas')
    if (extension.settings !== undefined) {
      const parsedSettings = settingsSchema.safeParse(extension.settings)
      if (!parsedSettings.success) throw new Error(`JSON Resume x-career-canvas.settings: ${parsedSettings.error.issues[0]?.message || 'invalid settings'}`)
      extensionSettings = parsedSettings.data
    }
    if (extension.sections !== undefined) {
      if (!Array.isArray(extension.sections)) throw new Error('JSON Resume x-career-canvas.sections must be a list.')
      const parsedExtension = validateResume({ schemaVersion: 2, id: createId('resume'), title: '', targetRole: '', industry: '', updatedAt: now(), profile: { name: '', headline: '', email: '', phone: '', location: '', website: '', summary: '', links: [] }, settings: extensionSettings ?? { layout: 'modern', pageSize: 'letter', fontPair: 'sans', density: 'balanced', accent: '#315f58' }, sections: extension.sections })
      sections.push(...parsedExtension.sections)
    }
  }
  const publications = sections.find((item) => item.kind === 'publications')?.entries.length ?? 0
  const name = jsonString(basics, 'name', 'basics')
  const label = jsonString(basics, 'label', 'basics')
  const meta = isRecord(value.meta) ? value.meta : {}
  const lastModified = jsonString(meta, 'lastModified', 'meta')
  return validateResume({
    schemaVersion: 2,
    id: createId('resume'),
    title: extensionTitle || `${name || label || 'Imported'} — JSON Resume`,
    targetRole: extensionTarget || label,
    industry: extensionIndustry,
    updatedAt: lastModified && !Number.isNaN(Date.parse(lastModified)) ? lastModified : now(),
    profile: {
      name,
      headline: label,
      email: jsonString(basics, 'email', 'basics'),
      phone: jsonString(basics, 'phone', 'basics'),
      location,
      website: jsonString(basics, 'url', 'basics'),
      summary: jsonString(basics, 'summary', 'basics'),
      links: profiles,
    },
    settings: extensionSettings ?? (publications >= 3 ? { layout: 'academic', pageSize: 'letter', fontPair: 'serif', density: 'comfortable', accent: '#3e4d75' } : { layout: 'modern', pageSize: 'letter', fontPair: 'sans', density: 'balanced', accent: '#315f58' }),
    sections,
  })
}

function migrateV1(value: Record<string, unknown>): ResumeDocument {
  if (!isRecord(value.profile) || !Array.isArray(value.sections)) throw new Error('Legacy resume is missing its profile or sections.')
  const oldLayout = oldString(value.layout)
  const sections: ResumeSection[] = value.sections.map((rawSection, sectionIndex) => {
    if (!isRecord(rawSection) || !Array.isArray(rawSection.entries)) throw new Error(`Legacy section ${sectionIndex + 1} is invalid.`)
    const rawKind = oldString(rawSection.kind)
    const kind: SectionKind = sectionKinds.includes(rawKind as SectionKind) ? rawKind as SectionKind : 'custom'
    return {
      id: oldString(rawSection.id) || createId('section'),
      kind,
      title: oldString(rawSection.title) || SECTION_CATALOG.find((item) => item.kind === kind)?.title || 'Section',
      visible: true,
      entries: rawSection.entries.map((rawEntry, entryIndex): ResumeEntry => {
        if (!isRecord(rawEntry)) throw new Error(`Legacy entry ${entryIndex + 1} in ${oldString(rawSection.title) || 'section'} is invalid.`)
        return {
          id: oldString(rawEntry.id) || createId('entry'),
          title: oldString(rawEntry.heading),
          organization: oldString(rawEntry.subheading),
          location: oldString(rawEntry.location),
          startDate: '',
          endDate: oldString(rawEntry.period),
          current: /present|current|now/i.test(oldString(rawEntry.period)),
          url: '',
          summary: '',
          highlights: Array.isArray(rawEntry.highlights) ? rawEntry.highlights.filter((item): item is string => typeof item === 'string') : [],
          keywords: [],
        }
      }),
    }
  })
  return validateResume({
    schemaVersion: 2,
    id: createId('resume'),
    title: `${oldString(value.profile.name) || 'Imported'} resume`,
    targetRole: oldString(value.profile.headline),
    industry: '',
    updatedAt: now(),
    profile: {
      name: oldString(value.profile.name),
      headline: oldString(value.profile.headline),
      email: oldString(value.profile.email),
      phone: oldString(value.profile.phone),
      location: oldString(value.profile.location),
      website: oldString(value.profile.website),
      summary: oldString(value.profile.summary),
      links: [],
    },
    settings: {
      layout: oldLayout === 'classic' ? 'classic' : oldLayout === 'compact' ? 'compact' : 'modern',
      pageSize: 'letter',
      fontPair: oldLayout === 'classic' ? 'serif' : 'sans',
      density: oldLayout === 'compact' ? 'tight' : 'balanced',
      accent: '#315f58',
    },
    sections,
  })
}

export function migrateResume(value: unknown): ResumeDocument {
  assertDocumentSize(value)
  if (!isRecord(value)) throw new Error('Resume must be an object.')
  if (value.schemaVersion === 2) return validateResume(value)
  if (value.schemaVersion === 1) return migrateV1(value)
  if (isJsonResume(value)) return migrateJsonResume(value)
  throw new Error('Unsupported resume schema. Expected Career Canvas version 1 or 2, or a JSON Resume document.')
}

export function cloneResume(resume: ResumeDocument): ResumeDocument {
  return validateResume(JSON.parse(JSON.stringify(resume)) as unknown)
}

function entry(overrides: Partial<ResumeEntry> = {}): ResumeEntry {
  return {
    id: createId('entry'),
    title: '',
    organization: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    url: '',
    summary: '',
    highlights: [],
    keywords: [],
    ...overrides,
  }
}

function section(kind: SectionKind, title: string, entries: ResumeEntry[], id = createId(kind)): ResumeSection {
  return { id, kind, title, visible: true, entries }
}

function universalResume(): ResumeDocument {
  return {
    schemaVersion: 2,
    id: 'resume-primary',
    title: 'Primary resume',
    targetRole: 'Operations & Program Leadership',
    industry: 'Cross-industry',
    updatedAt: now(),
    profile: {
      name: 'Jordan Lee',
      headline: 'Operations and program leader turning complexity into measurable progress',
      email: 'jordan.lee@example.com',
      phone: '+1 555 014 2030',
      location: 'Phoenix, AZ',
      website: 'jordanlee.com',
      summary: 'Collaborative leader with 9+ years guiding cross-functional programs, improving customer outcomes, and building practical operating systems. Known for turning ambiguous priorities into clear ownership, useful measures, and sustainable progress.',
      links: [{ id: 'link-linkedin', label: 'LinkedIn', url: 'linkedin.com/in/jordanlee' }],
    },
    settings: { layout: 'modern', pageSize: 'letter', fontPair: 'sans', density: 'balanced', accent: '#315f58' },
    sections: [
      section('experience', 'Experience', [
        entry({ id: 'experience-1',
          title: 'Senior Program Manager', organization: 'Northstar Group', location: 'Phoenix, AZ', startDate: '2022', current: true,
          highlights: ['Led a 14-person cross-functional portfolio that delivered 11 strategic initiatives on schedule.', 'Reduced customer onboarding time 34% by redesigning handoffs, ownership, and success measures.', 'Built an operating cadence adopted across four departments, improving risk visibility and decision speed.'],
        }),
        entry({ id: 'experience-2',
          title: 'Operations Manager', organization: 'Fieldwork Partners', location: 'Tempe, AZ', startDate: '2018', endDate: '2022',
          highlights: ['Managed a $2.4M annual operating plan while maintaining service levels through rapid growth.', 'Coached six team leads and introduced performance standards that improved retention by 18%.'],
        }),
      ], 'experience'),
      section('skills', 'Capabilities', [entry({ id: 'skills-1', title: 'Leadership', keywords: ['Program strategy', 'Operational excellence', 'Change management', 'Team development'] }), entry({ id: 'skills-2', title: 'Tools & methods', keywords: ['Process design', 'Data analysis', 'Budgeting', 'Executive communication'] })], 'skills'),
      section('education', 'Education', [entry({ id: 'education-1', title: 'B.S., Business Administration', organization: 'Arizona State University', endDate: '2018' })], 'education'),
    ],
  }
}

function applyStarter(base: ResumeDocument, starter: StarterId): ResumeDocument {
  if (starter === 'universal') return base
  const variants: Record<Exclude<StarterId, 'universal'>, Partial<ResumeDocument>> = {
    leadership: { title: 'Executive resume', targetRole: 'Vice President, Operations', industry: 'Business leadership', settings: { ...base.settings, layout: 'executive', fontPair: 'editorial', accent: '#263a51' } },
    healthcare: { title: 'Clinical resume', targetRole: 'Registered Nurse', industry: 'Healthcare', settings: { ...base.settings, layout: 'classic', accent: '#17656b' } },
    education: { title: 'Education resume', targetRole: 'Instructional Leader', industry: 'Education', settings: { ...base.settings, layout: 'classic', fontPair: 'serif', accent: '#6a4938' } },
    creative: { title: 'Creative resume', targetRole: 'Creative Director', industry: 'Creative & media', settings: { ...base.settings, layout: 'modern', fontPair: 'editorial', accent: '#9c3f52' } },
    trades: { title: 'Skilled trades resume', targetRole: 'Lead Technician', industry: 'Skilled trades', settings: { ...base.settings, layout: 'compact', density: 'tight', accent: '#9a541c' } },
    student: { title: 'Early career resume', targetRole: 'Entry-level opportunity', industry: 'Early career', settings: { ...base.settings, layout: 'compact', accent: '#415ca4' } },
    public_service: { title: 'Public service resume', targetRole: 'Public Program Manager', industry: 'Government & public service', settings: { ...base.settings, layout: 'minimal', accent: '#263a51' } },
    career_change: { title: 'Career change resume', targetRole: 'Project Coordinator', industry: 'Career transition', settings: { ...base.settings, layout: 'minimal', accent: '#315f58' } },
    academic: { title: 'Academic CV', targetRole: 'Research & Teaching', industry: 'Academic research', settings: { ...base.settings, layout: 'academic', fontPair: 'serif', density: 'comfortable', accent: '#3e4d75' } },
  }
  const result = { ...base, ...variants[starter], id: createId('resume'), updatedAt: now() }
  if (starter === 'leadership') {
    result.profile = { ...base.profile, headline: 'Enterprise operations executive aligning people, systems, and strategy', summary: 'Operations executive with 15+ years scaling multi-site teams, translating strategy into accountable operating plans, and leading transformations that improve growth, margin, customer trust, and organizational health.' }
    result.sections = [
      section('experience', 'Executive experience', [
        entry({ title: 'Vice President, Operations', organization: 'Northstar Group', location: 'Phoenix, AZ', startDate: '2021', current: true, highlights: ['Directed a 220-person, $48M multi-site operation through two integrations while sustaining customer and employee retention.', 'Expanded operating margin 6 points by aligning portfolio decisions, capacity planning, and frontline improvement.', 'Built a succession and leadership system that filled 71% of management openings internally.'] }),
        entry({ title: 'Director of Operations', organization: 'Fieldwork Partners', startDate: '2016', endDate: '2021', highlights: ['Scaled service delivery from three to nine markets and established consistent quality, financial, and risk controls.', 'Negotiated strategic supplier agreements that reduced annual cost $1.8M without compromising service levels.'] }),
      ]),
      section('skills', 'Leadership capabilities', [entry({ title: 'Enterprise leadership', keywords: ['Operating strategy', 'P&L ownership', 'Transformation', 'M&A integration', 'Board communication'] }), entry({ title: 'Organization', keywords: ['Talent systems', 'Change leadership', 'Governance', 'Risk management', 'Cross-functional alignment'] })]),
      section('education', 'Education', [entry({ title: 'M.B.A.', organization: 'Arizona State University' }), entry({ title: 'B.S., Business Administration', organization: 'State University' })]),
      section('affiliations', 'Board & community leadership', [entry({ title: 'Board member', organization: 'Regional Workforce Alliance', startDate: '2022', current: true })]),
    ]
  }
  if (starter === 'healthcare') {
    result.profile = { ...base.profile, headline: 'Registered nurse | Acute care, patient education, and quality improvement', summary: 'Patient-centered registered nurse with 7+ years in high-acuity medical-surgical settings. Known for calm clinical judgment, clear family education, interdisciplinary coordination, and practical quality improvements that strengthen safety and continuity of care.' }
    result.sections = [
      section('experience', 'Clinical experience', [
        entry({ title: 'Registered Nurse II — Medical/Surgical', organization: 'Valley Regional Medical Center', location: 'Phoenix, AZ', startDate: '2021', current: true, highlights: ['Coordinate evidence-based care for 4–6 patients per shift across complex medical and postsurgical needs.', 'Reduced unit medication-reconciliation exceptions 23% by co-leading a nurse and pharmacy workflow review.', 'Precepted 12 graduate nurses and created concise shift resources adopted in unit onboarding.'] }),
        entry({ title: 'Registered Nurse — Telemetry', organization: 'Desert View Hospital', location: 'Tempe, AZ', startDate: '2018', endDate: '2021', highlights: ['Managed changing patient conditions using focused assessment, escalation protocols, and interdisciplinary communication.', 'Served on the falls-prevention council during a 14-month period with no serious fall-related injury on the unit.'] }),
      ]),
      section('certifications', 'Licensure & certifications', [entry({ title: 'Registered Nurse — Arizona', organization: 'License in good standing', endDate: 'Active' }), entry({ title: 'BLS & ACLS', organization: 'American Heart Association', endDate: 'Current' })]),
      section('skills', 'Clinical capabilities', [entry({ title: 'Patient care', keywords: ['Acute care', 'Telemetry', 'Patient education', 'Care planning', 'Discharge coordination'] }), entry({ title: 'Quality & collaboration', keywords: ['Clinical documentation', 'Safety improvement', 'Precepting', 'Interdisciplinary rounds', 'Epic'] })]),
      section('education', 'Education', [entry({ title: 'B.S.N., Nursing', organization: 'Arizona State University', endDate: '2018' })]),
    ]
  }
  if (starter === 'education') {
    result.profile = { ...base.profile, headline: 'Instructional leader building rigorous, inclusive learning communities', summary: 'Student-centered educator and instructional leader with 10+ years supporting strong teaching, coherent curriculum, and collaborative improvement. Brings practical experience using evidence, coaching, and family partnership to expand meaningful learning for every student.' }
    result.sections = [
      section('experience', 'Education experience', [
        entry({ title: 'Assistant Principal, Teaching & Learning', organization: 'Central High School', location: 'Phoenix, AZ', startDate: '2021', current: true, highlights: ['Coach 38 educators across four departments using observation, planning, and student-work cycles.', 'Increased ninth-grade on-track completion from 78% to 89% through targeted supports and shared progress routines.', 'Led a master-schedule redesign that expanded advanced coursework access while preserving intervention time.'] }),
        entry({ title: 'English Language Arts Teacher', organization: 'Roosevelt School District', startDate: '2014', endDate: '2021', highlights: ['Designed standards-aligned, culturally responsive units for grades 9–11 and supported shared curriculum development.', 'Launched a student publishing program whose participation grew from 24 to 110 learners.'] }),
      ]),
      section('skills', 'Leadership & instruction', [entry({ title: 'Instructional leadership', keywords: ['Teacher coaching', 'Curriculum design', 'Assessment literacy', 'Multi-tiered supports'] }), entry({ title: 'Community', keywords: ['Family partnership', 'Restorative practice', 'Team facilitation', 'Inclusive learning'] })]),
      section('education', 'Education', [entry({ title: 'M.Ed., Educational Leadership', organization: 'Arizona State University', endDate: '2021' }), entry({ title: 'B.A., English Education', organization: 'State University', endDate: '2014' })]),
      section('certifications', 'Credentials', [entry({ title: 'Principal, PreK–12', organization: 'Arizona Department of Education', endDate: 'Current' }), entry({ title: 'Secondary English, 6–12', organization: 'Arizona Department of Education', endDate: 'Current' })]),
    ]
  }
  if (starter === 'creative') {
    result.profile = { ...base.profile, headline: 'Creative director shaping memorable brands and high-performing teams', website: 'jordanlee.design', summary: 'Concept-driven creative leader with 11+ years turning strategy into distinctive brand systems, campaigns, and digital experiences. Builds trusting client partnerships and multidisciplinary teams that pair craft with clear commercial results.' }
    result.sections = [
      section('experience', 'Experience', [
        entry({ title: 'Creative Director', organization: 'Northstar Studio', location: 'Phoenix / Remote', startDate: '2021', current: true, highlights: ['Directed brand and campaign work across a $6M portfolio spanning technology, hospitality, and public-interest clients.', 'Grew retained creative revenue 42% by pairing stronger strategic discovery with modular production systems.', 'Built and mentored a 12-person multidisciplinary team with clear critique, growth, and quality practices.'] }),
        entry({ title: 'Associate Creative Director', organization: 'Fieldwork Collective', startDate: '2017', endDate: '2021', highlights: ['Led integrated launches across identity, film, social, and digital product surfaces.', 'Produced an award-recognized public-service campaign that reached 8.2M people and increased program inquiries 31%.'] }),
      ]),
      section('projects', 'Selected work', [entry({ title: 'Civic Commons rebrand', organization: 'Brand strategy, identity, and launch', summary: 'Unified 14 local programs under one flexible public-facing system and toolkit.', url: 'jordanlee.design/civic-commons' }), entry({ title: 'Northline hospitality launch', organization: 'Campaign and digital experience', summary: 'Led concept through production for a three-market opening campaign.', url: 'jordanlee.design/northline' })]),
      section('skills', 'Capabilities', [entry({ title: 'Creative leadership', keywords: ['Brand strategy', 'Art direction', 'Campaigns', 'Storytelling', 'Creative operations'] }), entry({ title: 'Practice', keywords: ['Design systems', 'Digital experiences', 'Figma', 'Adobe Creative Cloud', 'Production'] })]),
      section('education', 'Education', [entry({ title: 'B.F.A., Communication Design', organization: 'State University', endDate: '2015' })]),
    ]
  }
  if (starter === 'trades') {
    result.profile = { ...base.profile, headline: 'Lead industrial maintenance technician | Electrical, controls, and reliability', summary: 'Safety-focused maintenance professional with 12+ years troubleshooting electrical and mechanical systems in high-volume facilities. Trusted to lead complex repairs, preventive maintenance, shutdown work, and technician development while protecting uptime and quality.' }
    result.sections = [
      section('experience', 'Relevant experience', [
        entry({ title: 'Lead Maintenance Technician', organization: 'Sonoran Manufacturing', location: 'Mesa, AZ', startDate: '2020', current: true, highlights: ['Lead shift response and planned work for a 650,000-square-foot automated production facility.', 'Reduced unplanned conveyor downtime 28% through failure analysis, PM redesign, and critical-spares standards.', 'Trained eight technicians on lockout/tagout, electrical troubleshooting, PLC diagnostics, and work documentation.'] }),
        entry({ title: 'Industrial Electrician', organization: 'Copper State Services', startDate: '2014', endDate: '2020', highlights: ['Installed, tested, and repaired motor controls, VFDs, panels, and 480V distribution across industrial projects.', 'Completed six years without a recordable safety incident while supporting outages and emergency calls.'] }),
      ]),
      section('certifications', 'Licenses & certifications', [entry({ title: 'Journeyman Electrician', organization: 'State of Arizona', endDate: 'Active' }), entry({ title: 'OSHA 30-Hour — General Industry', organization: 'OSHA', endDate: 'Current' })]),
      section('skills', 'Systems & equipment', [entry({ title: 'Electrical & controls', keywords: ['480V systems', 'Motor controls', 'VFDs', 'PLC diagnostics', 'NFPA 70E'] }), entry({ title: 'Reliability', keywords: ['Preventive maintenance', 'Root cause analysis', 'CMMS', 'Hydraulics', 'Pneumatics'] })]),
      section('education', 'Training', [entry({ title: 'Electrical Apprenticeship', organization: 'Regional Joint Apprenticeship Program', endDate: '2014' })]),
    ]
  }
  if (starter === 'student') {
    result.profile = { ...base.profile, headline: 'Business analytics student applying data to practical decisions', website: '', summary: 'Curious business analytics student with hands-on experience in data cleaning, visualization, customer research, and team-based problem solving. Communicates clearly, learns quickly, and enjoys turning ambiguous questions into useful next steps.' }
    result.sections = [
      section('education', 'Education', [entry({ title: 'B.S., Business Data Analytics', organization: 'Arizona State University', location: 'Tempe, AZ', startDate: '2023', endDate: 'Expected May 2027', highlights: ['GPA: 3.7/4.0', 'Relevant study: data analysis, statistics, operations, information systems, and business communication'] })]),
      section('projects', 'Relevant projects', [entry({ title: 'Community food-access dashboard', organization: 'Applied Analytics Lab', endDate: '2026', highlights: ['Cleaned and joined five public datasets in Python to compare access patterns across 42 neighborhoods.', 'Designed an interactive dashboard and presented recommendations to a community partner.'] }), entry({ title: 'Customer retention analysis', organization: 'Business Statistics', endDate: '2025', highlights: ['Built and evaluated a regression model, documented assumptions, and translated findings for a nontechnical audience.'] })]),
      section('experience', 'Experience', [entry({ title: 'Operations Intern', organization: 'Northstar Group', location: 'Phoenix, AZ', startDate: 'May 2026', endDate: 'Aug 2026', highlights: ['Mapped a customer-request workflow and identified changes that shortened average resolution time 12%.', 'Created weekly reporting templates used by three team leads.'] }), entry({ title: 'Peer Tutor — Statistics', organization: 'University Academic Success Center', startDate: '2025', current: true, highlights: ['Support 8–12 students weekly through individualized practice, questions, and study planning.'] })]),
      section('skills', 'Skills', [entry({ title: 'Analysis', keywords: ['Excel', 'SQL', 'Python', 'Tableau', 'Statistical analysis'] }), entry({ title: 'Collaboration', keywords: ['Presentation', 'Research', 'Facilitation', 'Project coordination'] })]),
    ]
  }
  if (starter === 'public_service') {
    result.profile = { ...base.profile, headline: 'Public program manager | Accountable delivery and community partnership', summary: 'Public-service leader with 10+ years translating policy goals into accessible programs, responsible grants, and measurable community outcomes. Builds practical partnerships across agencies and nonprofits while strengthening transparency, compliance, and resident experience.' }
    result.sections = [
      section('experience', 'Public service experience', [
        entry({ title: 'Program Manager, Community Services', organization: 'City of Sonoran Hills', location: 'Phoenix, AZ', startDate: '2021', current: true, highlights: ['Administer a $7.8M community-services portfolio across 14 nonprofit partners with clean annual monitoring results.', 'Cut average benefit-application wait time from 19 to 11 days by redesigning intake, review, and resident communication.', 'Built a public performance dashboard and quarterly partner forum that improved issue resolution and accountability.'] }),
        entry({ title: 'Senior Program Analyst', organization: 'Maricopa Regional Partnership', location: 'Phoenix, AZ', startDate: '2016', endDate: '2021', highlights: ['Evaluated service access and contract performance across six municipalities and presented findings to public boards.', 'Standardized grant reporting and technical assistance, reducing incomplete partner submissions 46%.'] }),
      ]),
      section('skills', 'Public-service capabilities', [entry({ title: 'Program stewardship', keywords: ['Program implementation', 'Grants management', 'Contract monitoring', 'Public budgeting', 'Performance measurement'] }), entry({ title: 'Community delivery', keywords: ['Resident experience', 'Cross-agency partnership', 'Public communication', 'Facilitation', 'Continuous improvement'] })]),
      section('education', 'Education', [entry({ title: 'Master of Public Administration', organization: 'Arizona State University', endDate: '2016' }), entry({ title: 'B.A., Sociology', organization: 'State University', endDate: '2012' })]),
      section('volunteering', 'Community service', [entry({ title: 'Volunteer tax-preparation site lead', organization: 'Community Resource Network', startDate: '2019', current: true, highlights: ['Coordinate 18 volunteers serving low- and moderate-income households during the annual filing season.'] })]),
    ]
  }
  if (starter === 'career_change') {
    result.profile = { ...base.profile, headline: 'Customer operations leader moving into project coordination', summary: 'Operations professional bringing 9+ years coordinating people, timelines, vendors, and customer-facing change in fast-moving service environments. Ready to apply disciplined planning, clear communication, and practical problem solving to cross-functional project delivery.' }
    result.sections = [
      section('skills', 'Transferable capabilities', [entry({ title: 'Project coordination', keywords: ['Work planning', 'Stakeholder updates', 'Risk tracking', 'Vendor coordination', 'Process documentation'] }), entry({ title: 'Operations leadership', keywords: ['Team scheduling', 'Customer experience', 'Training', 'Quality improvement', 'Issue resolution'] })]),
      section('projects', 'Relevant projects', [entry({ title: 'Reservation-platform rollout', organization: 'Desert Harbor Hotels', startDate: '2025', endDate: '2025', highlights: ['Coordinated a 16-week reservation-platform rollout across four properties, including testing, vendor follow-up, training, and launch support.', 'Tracked 73 readiness items to closure and helped teams sustain service during cutover with no guest-facing outage.'] }), entry({ title: 'Guest-recovery workflow redesign', organization: 'Desert Harbor Hotels', endDate: '2024', highlights: ['Mapped recurring failure points and introduced clear escalation ownership, reducing unresolved cases 31%.'] })]),
      section('experience', 'Experience', [entry({ title: 'Guest Services Operations Lead', organization: 'Desert Harbor Hotels', location: 'Phoenix, AZ', startDate: '2020', current: true, highlights: ['Lead daily operations and scheduling for a 22-person team serving a 310-room property.', 'Coordinate facilities, technology, events, and vendor partners to resolve service risks and deliver major guest programs.', 'Created role-based onboarding that reduced new-hire time to independent work by 24%.'] }), entry({ title: 'Front Office Supervisor', organization: 'Copper Ridge Hospitality', startDate: '2017', endDate: '2020', highlights: ['Supervised shift operations, cash controls, guest recovery, and cross-department handoffs in a high-volume resort.'] })]),
      section('education', 'Education & training', [entry({ title: 'B.A., Communication', organization: 'State University', endDate: '2016' }), entry({ title: 'Project Management Foundations', organization: 'Regional Continuing Education', endDate: '2025' })]),
    ]
  }
  if (starter === 'academic') {
    result.profile = { ...base.profile, headline: 'Associate professor | Organizational behavior and collaborative work', website: 'jordanlee.edu', summary: 'Interdisciplinary scholar studying how teams coordinate expertise, learn, and make consequential decisions. Uses mixed methods and engaged research partnerships to produce rigorous, practical knowledge for organizations and educators.' }
    result.sections = [
      section('experience', 'Academic appointments', [entry({ title: 'Associate Professor of Management', organization: 'Arizona State University', startDate: '2023', current: true, highlights: ['Lead a research program on expertise coordination supported by federal and foundation funding.', 'Teach graduate and undergraduate courses in organizational behavior, research methods, and team leadership.'] }), entry({ title: 'Assistant Professor of Management', organization: 'Arizona State University', startDate: '2017', endDate: '2023', highlights: ['Advised 18 graduate and honors researchers; four received competitive university research awards.', 'Co-developed a community-engaged methods course enrolling 120 students across three years.'] })]),
      section('education', 'Education', [entry({ title: 'Ph.D., Organizational Behavior', organization: 'University of Michigan', endDate: '2017' }), entry({ title: 'B.A., Psychology', organization: 'State University', endDate: '2011' })]),
      section('publications', 'Selected publications', [entry({ title: 'Coordinating expertise under uncertainty', organization: 'Academy of Management Journal, 67(2)', endDate: '2024', summary: 'Lee, J., Rivera, M., & Chen, A.' }), entry({ title: 'Learning across professional boundaries', organization: 'Organization Science, 33(4)', endDate: '2022', summary: 'Lee, J. & Morgan, P.' })]),
      section('awards', 'Awards & grants', [entry({ title: 'Early Career Research Award', organization: 'Professional Association for Management Research', endDate: '2023' }), entry({ title: 'Principal Investigator — Collaborative Work Initiative', organization: 'National research foundation', startDate: '2022', endDate: '2025' })]),
      section('skills', 'Methods', [entry({ title: 'Research methods', keywords: ['Field studies', 'Interviews', 'Survey design', 'Multilevel modeling', 'R'] })]),
    ]
  }
  return validateResume(result)
}

export function createStarter(starter: StarterId = 'universal'): ResumeDocument {
  return applyStarter(universalResume(), starter)
}

export function createBlankResume(): ResumeDocument {
  const base = universalResume()
  return validateResume({
    ...base,
    id: createId('resume'),
    title: 'Untitled resume',
    targetRole: '',
    industry: '',
    updatedAt: now(),
    profile: { name: '', headline: '', email: '', phone: '', location: '', website: '', summary: '', links: [] },
    sections: [section('experience', 'Experience', [entry()]), section('education', 'Education', [entry()]), section('skills', 'Skills', [entry()])],
  })
}

export function createEntry(kind: SectionKind): ResumeEntry {
  if (kind === 'skills') return entry({ title: 'Skill group', keywords: ['Skill'] })
  if (kind === 'languages') return entry({ title: 'Language', organization: 'Proficiency' })
  return entry()
}

export function createSection(kind: SectionKind): ResumeSection {
  const catalog = SECTION_CATALOG.find((item) => item.kind === kind)
  return section(kind, catalog?.title ?? 'Custom section', [createEntry(kind)])
}

export function touchResume(resume: ResumeDocument): ResumeDocument {
  return { ...resume, updatedAt: now() }
}

export function moveInArray<T>(values: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= values.length) return [...values]
  const result = [...values]
  const [item] = result.splice(from, 1)
  if (item === undefined) return [...values]
  result.splice(Math.max(0, Math.min(result.length, to)), 0, item)
  return result
}

export function renderedPageCount(contentHeightCssPixels: number, pageSize: PageSize): number {
  const pageHeight = pageSize === 'a4' ? (297 / 25.4) * 96 : 11 * 96
  if (!Number.isFinite(contentHeightCssPixels) || contentHeightCssPixels <= 0) return 1
  return Math.max(1, Math.ceil(contentHeightCssPixels / pageHeight))
}

function cleanWords(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean)
}

const starterEvidenceMarkers = [
  'Reduced customer onboarding time 34%',
  'Expanded operating margin 6 points',
  'Reduced unit medication-reconciliation exceptions 23%',
  'Increased ninth-grade on-track completion from 78% to 89%',
  'Grew retained creative revenue 42%',
  'Reduced unplanned conveyor downtime 28%',
  'Cleaned and joined five public datasets in Python',
  'Advised 18 graduate and honors researchers',
  'Cut average benefit-application wait time from 19 to 11 days',
  'Coordinated a 16-week reservation-platform rollout',
]

export function containsStarterSampleContent(resume: ResumeDocument): boolean {
  const starterIdentityMatches = [
    resume.profile.name.trim().toLocaleLowerCase() === 'jordan lee',
    resume.profile.email.trim().toLocaleLowerCase() === 'jordan.lee@example.com',
    resume.profile.phone.replace(/\D/g, '') === '15550142030',
    resume.profile.website.trim().toLocaleLowerCase().startsWith('jordanlee.'),
    resume.profile.links.some((link) => link.url.toLocaleLowerCase().includes('linkedin.com/in/jordanlee')),
  ].filter(Boolean).length
  if (starterIdentityMatches >= 2) return true
  const evidence = resume.sections.flatMap((sectionItem) => sectionItem.entries.flatMap((entryItem) => [entryItem.summary, ...entryItem.highlights])).join('\n')
  return starterEvidenceMarkers.some((marker) => evidence.includes(marker))
}

export function analyzeResume(resume: ResumeDocument): ResumeAnalysis {
  const issues: ResumeIssue[] = []
  let penalty = 0
  const add = (issue: ResumeIssue, points: number) => { issues.push(issue); penalty += points }
  if (containsStarterSampleContent(resume)) add({ id: 'sample-content', severity: 'essential', title: 'Replace the fictional starter content', detail: 'A sample identity or result is still present. Replace every name, contact detail, organization, and claim with accurate information before exporting.' }, 25)
  if (!resume.profile.name.trim()) add({ id: 'name', severity: 'essential', title: 'Add your name', detail: 'Every exported resume needs a clear candidate name.' }, 20)
  if (!resume.profile.email.trim() && !resume.profile.phone.trim()) add({ id: 'contact', severity: 'essential', title: 'Add a direct contact method', detail: 'Include an email address or phone number recruiters can use.' }, 15)
  if (resume.profile.email.trim() && !emailHref(resume.profile.email)) add({ id: 'email-format', severity: 'essential', title: 'Check the email address', detail: 'It does not look like one complete standalone address. Verify it before anyone receives this resume.' }, 8)
  if (resume.profile.phone.trim() && !phoneHref(resume.profile.phone)) add({ id: 'phone-format', severity: 'improvement', title: 'Check the phone number', detail: 'Use 7–15 digits, an optional leading country code, and a clear extension if needed.' }, 4)
  if (!resume.targetRole.trim()) add({ id: 'target', severity: 'improvement', title: 'Name the target role', detail: 'A target helps you decide which evidence deserves space.' }, 7)
  const summaryWords = cleanWords(resume.profile.summary).length
  if (summaryWords < 25) add({ id: 'summary-short', severity: 'improvement', title: 'Strengthen the opening summary', detail: 'Aim for 35–70 words covering scope, strengths, and the value you create.' }, 8)
  if (summaryWords > 100) add({ id: 'summary-long', severity: 'tip', title: 'Tighten the opening summary', detail: 'A concise summary is easier to scan; keep the strongest 2–4 lines.' }, 3)
  const visible = resume.sections.filter((item) => item.visible)
  const evidenceKinds = new Set<SectionKind>(['experience', 'education', 'projects', 'certifications', 'volunteering', 'awards', 'publications', 'custom'])
  const hasSubstantiveEvidence = visible.some((sectionItem) => evidenceKinds.has(sectionItem.kind) && sectionItem.entries.some((entryItem) => entryItem.title.trim() && (entryItem.organization.trim() || entryItem.summary.trim() || entryItem.highlights.some((item) => item.trim()))))
  if (!hasSubstantiveEvidence) add({ id: 'evidence', severity: 'improvement', title: 'Add proof of your capabilities', detail: 'Use relevant work, projects, education, clinicals, research, service, credentials, or leadership—paid employment is not required.' }, 10)
  for (const sectionItem of visible) {
    if (!sectionItem.title.trim()) add({ id: `section-title-${sectionItem.id}`, sectionId: sectionItem.id, severity: 'essential', title: 'Name this section', detail: 'Section headings help people and screening systems understand the document.' }, 6)
    if (!sectionItem.entries.length || !sectionItem.entries.some((entryItem) => entryItem.title.trim() || entryItem.keywords.some(Boolean))) add({ id: `empty-${sectionItem.id}`, sectionId: sectionItem.id, severity: 'improvement', title: `${sectionItem.title || 'A section'} is empty`, detail: 'Add useful evidence or hide the section before exporting.' }, 4)
    const orphan = sectionItem.entries.find((entryItem) => !entryItem.title.trim() && (entryItem.organization.trim() || entryItem.summary.trim() || entryItem.highlights.some((item) => item.trim())))
    if (orphan) add({ id: `missing-entry-title-${sectionItem.id}`, sectionId: sectionItem.id, severity: 'improvement', title: `Name an entry in ${sectionItem.title || 'this section'}`, detail: 'An organization, description, or bullet is present without a role, credential, project, or item title.' }, 4)
    if (sectionItem.entries.some((entryItem) => entryItem.highlights.filter((item) => item.trim()).length > 7)) add({ id: `too-many-bullets-${sectionItem.id}`, sectionId: sectionItem.id, severity: 'tip', title: `Prioritize bullets in ${sectionItem.title || 'this section'}`, detail: 'More than seven bullets under one entry makes the strongest evidence harder to spot.' }, 2)
  }
  const experience = visible.filter((item) => item.kind === 'experience').flatMap((item) => item.entries)
  const incompleteExperience = experience.find((entryItem) => entryItem.title.trim() && (!entryItem.startDate.trim() || (!entryItem.current && !entryItem.endDate.trim())))
  if (incompleteExperience) add({ id: 'experience-dates', entryId: incompleteExperience.id, severity: 'improvement', title: 'Complete each experience timeline', detail: 'Give every role a start date and either an end date or the current-role setting.' }, 5)
  const reversedRange = visible.flatMap((sectionItem) => sectionItem.entries.map((entryItem) => ({ sectionItem, entryItem }))).find(({ entryItem }) => entryItem.startDate.trim() && entryItem.endDate.trim() && !entryItem.current && resumeDateRangeIsReversed(entryItem.startDate, entryItem.endDate))
  if (reversedRange) add({ id: 'reversed-date-range', sectionId: reversedRange.sectionItem.id, entryId: reversedRange.entryItem.id, severity: 'essential', title: 'Fix a reversed date range', detail: `“${reversedRange.entryItem.title || reversedRange.sectionItem.title || 'This entry'}” appears to end before it starts. Verify both date fields.` }, 8)
  const futureCurrent = visible.flatMap((sectionItem) => sectionItem.entries.map((entryItem) => ({ sectionItem, entryItem }))).find(({ entryItem }) => entryItem.current && resumeDateIsDefinitelyFuture(entryItem.startDate))
  if (futureCurrent) add({ id: 'future-current-entry', sectionId: futureCurrent.sectionItem.id, entryId: futureCurrent.entryItem.id, severity: 'essential', title: 'Verify a future-dated current item', detail: `“${futureCurrent.entryItem.title || futureCurrent.sectionItem.title || 'This entry'}” is marked current but has a start date that is definitely in the future.` }, 8)
  const ongoingStatusKinds = new Set<SectionKind>(['experience', 'education', 'skills', 'projects', 'volunteering', 'languages', 'affiliations', 'interests', 'custom'])
  const mismatchedCurrentStatus = visible.flatMap((sectionItem) => sectionItem.entries.map((entryItem) => ({ sectionItem, entryItem }))).find(({ sectionItem, entryItem }) => ongoingStatusKinds.has(sectionItem.kind) && !entryItem.current && /^(present|current|ongoing|in progress|active)$/i.test(entryItem.endDate.trim()))
  if (mismatchedCurrentStatus) add({ id: 'current-status-mismatch', sectionId: mismatchedCurrentStatus.sectionItem.id, entryId: mismatchedCurrentStatus.entryItem.id, severity: 'improvement', title: 'Resolve an ongoing-status mismatch', detail: `“${mismatchedCurrentStatus.entryItem.title || mismatchedCurrentStatus.sectionItem.title || 'This entry'}” uses “${mismatchedCurrentStatus.entryItem.endDate.trim()}” as its end value while its ongoing setting is off. Turn it on or enter an actual end date.` }, 4)
  const bullets = visible.flatMap((item) => item.entries.flatMap((entryItem) => entryItem.highlights)).filter((item) => item.trim())
  if (experience.length && bullets.length < 2) add({ id: 'few-bullets', severity: 'improvement', title: 'Show more evidence', detail: 'Use concise bullets to show actions, scope, and outcomes—not only responsibilities.' }, 7)
  if (bullets.length && !bullets.some((bullet) => /\d|%|\$/.test(bullet))) add({ id: 'outcomes', severity: 'improvement', title: 'Add scale or outcomes', detail: 'Numbers are useful when honest, but scope, speed, quality, safety, and stakeholder impact also count.' }, 6)
  if (bullets.some((bullet) => cleanWords(bullet).length > 35)) add({ id: 'long-bullets', severity: 'tip', title: 'Shorten long bullets', detail: 'Keep most bullets under 25–30 words so the outcome is visible at a glance.' }, 3)
  const normalizedBullets = bullets.map((bullet) => bullet.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
  if (new Set(normalizedBullets).size !== normalizedBullets.length) add({ id: 'duplicate-bullets', severity: 'improvement', title: 'Remove repeated bullets', detail: 'Use the space for a different contribution, capability, or outcome.' }, 4)
  if (bullets.some((bullet) => /^(responsible for|duties included|helped (with|to)|worked on)\b/i.test(bullet.trim()))) add({ id: 'weak-bullets', severity: 'tip', title: 'Clarify ownership in a few bullets', detail: 'Replace responsibility phrases with the action you took and why it mattered.' }, 3)
  if (bullets.some((bullet) => /\b(i|me|my|we|our)\b/i.test(bullet))) add({ id: 'first-person-bullets', severity: 'tip', title: 'Remove first-person pronouns from bullets', detail: 'Resume bullets conventionally begin with the action; “I” and “we” are usually unnecessary.' }, 2)
  if (bullets.length >= 3) {
    const weakStarts = bullets.filter((bullet) => {
      const first = bullet.trim().toLowerCase().replace(/[^a-z].*$/, '')
      return first && !actionVerbs.has(first)
    })
    if (weakStarts.length / bullets.length > 0.65) add({ id: 'verbs', severity: 'tip', title: 'Lead more bullets with decisive verbs', detail: 'Starting with your action makes ownership and contribution easier to understand.' }, 3)
  }
  const links = [resume.profile.website, ...resume.profile.links.map((link) => link.url), ...visible.flatMap((sectionItem) => sectionItem.entries.map((entryItem) => entryItem.url))].filter((value) => value.trim())
  if (links.some((value) => !externalHref(value))) add({ id: 'links', severity: 'improvement', title: 'Check every web link', detail: 'At least one website or profile link is incomplete, unsafe, or includes sign-in credentials. Open each link before sending.' }, 4)
  const unlabeledProfile = resume.profile.links.find((link) => externalHref(link.url) && !link.label.trim())
  if (unlabeledProfile) add({ id: 'unlabeled-profile-link', severity: 'tip', title: 'Label a profile link', detail: 'Use a short reader-facing label such as LinkedIn, Portfolio, GitHub, or ORCID instead of printing the full destination.' }, 2)
  if (duplicateExternalLinkIndex(links) >= 0) add({ id: 'duplicate-links', severity: 'tip', title: 'Remove a repeated web link', detail: 'The same normalized destination appears more than once. Keep the clearest placement and use the space for distinct information.' }, 2)
  const allText = [resume.profile.name, resume.profile.headline, resume.profile.summary, ...visible.flatMap((item) => [item.title, ...item.entries.flatMap((entryItem) => [entryItem.title, entryItem.organization, entryItem.summary, ...entryItem.highlights, ...entryItem.keywords])])].join(' ')
  const words = cleanWords(allText).length
  return { score: Math.max(0, Math.min(100, 100 - penalty)), issues, words, bullets: bullets.length, estimatedPages: Math.max(1, Math.ceil(words / (resume.settings.density === 'tight' ? 720 : resume.settings.density === 'comfortable' ? 480 : 600))) }
}

export function resumeToText(resume: ResumeDocument): string {
  const lines: string[] = [resume.profile.name, resume.profile.headline]
  const contact = [resume.profile.email, resume.profile.phone, resume.profile.location, resume.profile.website, ...resume.profile.links.map((link) => link.label.trim() ? `${link.label.trim()}: ${link.url}` : link.url)].filter((item) => item.trim())
  if (contact.length) lines.push(contact.join(' | '))
  if (resume.profile.summary.trim()) lines.push('', 'SUMMARY', resume.profile.summary.trim())
  for (const sectionItem of resume.sections.filter((item) => item.visible && sectionHasRenderableContent(item))) {
    lines.push('', sectionItem.title.toUpperCase())
    for (const entryItem of sectionItem.entries.filter(entryHasRenderableContent)) {
      const heading = [entryItem.title, entryItem.organization].filter((item) => item.trim()).join(' — ')
      if (heading) lines.push(heading)
      const meta = [entryItem.location, formatEntryDateRange(entryItem, sectionItem.kind)].filter((item) => item.trim()).join(' | ')
      if (meta) lines.push(meta)
      if (entryItem.summary.trim()) lines.push(entryItem.summary.trim())
      for (const highlight of entryItem.highlights.filter((item) => item.trim())) lines.push(`• ${highlight.trim()}`)
      if (entryItem.keywords.some((item) => item.trim())) lines.push(entryItem.keywords.filter((item) => item.trim()).join(' • '))
      if (entryItem.url.trim()) lines.push(entryItem.url.trim())
    }
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

export function safeFilename(value: string): string {
  return value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'resume'
}
