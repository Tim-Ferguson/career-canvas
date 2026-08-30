import { entryHasRenderableContent, type ResumeDocument, type ResumeEntry, type SectionKind } from './resume'

export interface JsonResumeExportResult {
  document: Record<string, unknown>
  warnings: string[]
}

function clean(values: string[]): string[] {
  return values.filter((value) => value.trim())
}

function timeline(entry: ResumeEntry) {
  return {
    startDate: entry.startDate,
    endDate: entry.current ? '' : entry.endDate,
    location: entry.location,
    url: entry.url,
    summary: entry.summary,
    highlights: clean(entry.highlights),
    keywords: clean(entry.keywords),
    current: entry.current,
  }
}

export function buildJsonResumeExport(resume: ResumeDocument): JsonResumeExportResult {
  const visible = resume.sections.filter((section) => section.visible)
  const entries = (kind: SectionKind) => visible.filter((section) => section.kind === kind).flatMap((section) => section.entries).filter(entryHasRenderableContent)
  const document: Record<string, unknown> = {
    $schema: 'https://jsonresume.org/schema',
    basics: {
      name: resume.profile.name,
      label: resume.profile.headline || resume.targetRole,
      email: resume.profile.email,
      phone: resume.profile.phone,
      url: resume.profile.website,
      summary: resume.profile.summary,
      location: resume.profile.location ? { address: resume.profile.location } : {},
      profiles: resume.profile.links.map((link) => ({ network: link.label, username: '', url: link.url })),
    },
    meta: { version: '1.0.0', lastModified: resume.updatedAt },
  }

  const add = (key: string, value: unknown[]) => { if (value.length) document[key] = value }
  add('work', entries('experience').map((entry) => ({ name: entry.organization, position: entry.title, ...timeline(entry) })))
  add('volunteer', entries('volunteering').map((entry) => ({ organization: entry.organization, position: entry.title, ...timeline(entry) })))
  add('education', entries('education').map((entry) => ({ institution: entry.organization, area: '', studyType: entry.title, score: '', courses: [], ...timeline(entry) })))
  add('projects', entries('projects').map((entry) => ({ name: entry.title, entity: entry.organization, type: '', roles: [], description: entry.summary, ...timeline(entry) })))
  add('certificates', entries('certifications').map((entry) => ({ name: entry.title, issuer: entry.organization, date: entry.startDate, ...timeline(entry) })))
  add('awards', entries('awards').map((entry) => ({ title: entry.title, awarder: entry.organization, date: entry.endDate || entry.startDate, ...timeline(entry) })))
  add('publications', entries('publications').map((entry) => ({ name: entry.title, publisher: entry.organization, releaseDate: entry.endDate || entry.startDate, ...timeline(entry) })))
  add('skills', entries('skills').map((entry) => ({ name: entry.title, level: entry.organization, ...timeline(entry) })))
  add('languages', entries('languages').map((entry) => ({ language: entry.title, fluency: entry.organization, ...timeline(entry) })))
  add('interests', entries('interests').map((entry) => ({ name: entry.title, ...timeline(entry) })))

  const extensionSections = visible.filter((section) => section.kind === 'affiliations' || section.kind === 'custom').filter((section) => section.entries.some(entryHasRenderableContent))
  if (extensionSections.length || resume.industry || resume.settings) {
    document['x-career-canvas'] = {
      schemaVersion: 1,
      title: resume.title,
      targetRole: resume.targetRole,
      industry: resume.industry,
      settings: resume.settings,
      sections: extensionSections,
    }
  }

  const warnings: string[] = []
  const hiddenSections = resume.sections.filter((section) => !section.visible && section.entries.some(entryHasRenderableContent)).length
  if (hiddenSections) warnings.push(`${hiddenSections} hidden ${hiddenSections === 1 ? 'section was' : 'sections were'} omitted from this sharing copy.`)
  if (extensionSections.length) warnings.push(`${extensionSections.length} visible affiliation or custom ${extensionSections.length === 1 ? 'section is' : 'sections are'} stored in a namespaced Career Canvas extension that some JSON Resume tools may ignore.`)
  return { document, warnings }
}
