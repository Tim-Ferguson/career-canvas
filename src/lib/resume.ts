import { z } from 'zod'

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

export const layouts = ['modern', 'classic', 'executive', 'compact', 'academic'] as const
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

export type StarterId = 'universal' | 'leadership' | 'healthcare' | 'education' | 'creative' | 'trades' | 'student' | 'academic'

export const STARTERS: readonly StarterDefinition[] = [
  { id: 'universal', label: 'Universal', eyebrow: 'Balanced', description: 'A flexible, ATS-friendly starting point for most experienced professionals.' },
  { id: 'leadership', label: 'Leadership', eyebrow: 'Executive', description: 'Prioritizes scope, business outcomes, transformation, and board-ready clarity.' },
  { id: 'healthcare', label: 'Healthcare', eyebrow: 'Clinical', description: 'Makes licenses, clinical settings, patient impact, and credentials easy to scan.' },
  { id: 'education', label: 'Education', eyebrow: 'Teaching', description: 'Balances instruction, curriculum, learner outcomes, service, and credentials.' },
  { id: 'creative', label: 'Creative', eyebrow: 'Portfolio', description: 'Pairs selected work and portfolio links with measurable commercial outcomes.' },
  { id: 'trades', label: 'Skilled trades', eyebrow: 'Hands-on', description: 'Highlights certifications, safety, equipment, project scope, and reliability.' },
  { id: 'student', label: 'Student', eyebrow: 'Early career', description: 'Leads with education, relevant projects, capabilities, and transferable experience.' },
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
  throw new Error('Unsupported resume schema. Expected version 1 or 2.')
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
  if (resume.profile.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resume.profile.email.trim())) add({ id: 'email-format', severity: 'essential', title: 'Check the email address', detail: 'It does not look complete. Verify it before anyone receives this resume.' }, 8)
  if (resume.profile.phone.trim() && resume.profile.phone.replace(/\D/g, '').length < 7) add({ id: 'phone-format', severity: 'improvement', title: 'Check the phone number', detail: 'Include enough digits and any country or area code your reader will need.' }, 4)
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
  if (experience.some((entryItem) => entryItem.title.trim() && !entryItem.startDate.trim() && !entryItem.endDate.trim() && !entryItem.current)) add({ id: 'experience-dates', severity: 'improvement', title: 'Add dates to each experience', detail: 'A year or month-and-year range gives readers the timeline they expect.' }, 5)
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
  if (links.some((value) => {
    try {
      const parsed = new URL(externalHref(value))
      return !['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')
    } catch {
      return true
    }
  })) add({ id: 'links', severity: 'improvement', title: 'Check every web link', detail: 'At least one website or profile link looks incomplete. Open each link before sending.' }, 4)
  const allText = [resume.profile.name, resume.profile.headline, resume.profile.summary, ...visible.flatMap((item) => [item.title, ...item.entries.flatMap((entryItem) => [entryItem.title, entryItem.organization, entryItem.summary, ...entryItem.highlights, ...entryItem.keywords])])].join(' ')
  const words = cleanWords(allText).length
  return { score: Math.max(0, Math.min(100, 100 - penalty)), issues, words, bullets: bullets.length, estimatedPages: Math.max(1, Math.ceil(words / (resume.settings.density === 'tight' ? 720 : resume.settings.density === 'comfortable' ? 480 : 600))) }
}

export function resumeToText(resume: ResumeDocument): string {
  const lines: string[] = [resume.profile.name, resume.profile.headline]
  const contact = [resume.profile.email, resume.profile.phone, resume.profile.location, resume.profile.website, ...resume.profile.links.map((link) => `${link.label}: ${link.url}`)].filter((item) => item.trim())
  if (contact.length) lines.push(contact.join(' | '))
  if (resume.profile.summary.trim()) lines.push('', 'SUMMARY', resume.profile.summary.trim())
  for (const sectionItem of resume.sections.filter((item) => item.visible)) {
    lines.push('', sectionItem.title.toUpperCase())
    for (const entryItem of sectionItem.entries) {
      const heading = [entryItem.title, entryItem.organization].filter((item) => item.trim()).join(' — ')
      if (heading) lines.push(heading)
      const meta = [entryItem.location, [entryItem.startDate, entryItem.current ? 'Present' : entryItem.endDate].filter(Boolean).join(' – ')].filter(Boolean).join(' | ')
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

export function externalHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
