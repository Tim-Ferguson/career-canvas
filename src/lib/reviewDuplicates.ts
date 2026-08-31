import { externalHref } from './contactLinks'
import type { ResumeDocument, ResumeEntry } from './resume'

export interface DuplicateReviewLocation {
  sectionId: string
  entryId?: string
  itemIndex?: number
}

export function normalizeReviewDuplicate(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function findDuplicateSectionTitle(resume: ResumeDocument): DuplicateReviewLocation | null {
  const seen = new Set<string>()
  for (const section of resume.sections.filter((item) => item.visible)) {
    const normalized = normalizeReviewDuplicate(section.title)
    if (!normalized) continue
    if (seen.has(normalized)) return { sectionId: section.id }
    seen.add(normalized)
  }
  return null
}

function entryFingerprint(entry: ResumeEntry): string {
  const scalarValues = [entry.title, entry.organization, entry.location, entry.startDate, entry.endDate, entry.url, entry.summary]
  const meaningfulFields = scalarValues.filter((value) => value.trim()).length + entry.highlights.filter((value) => value.trim()).length + entry.keywords.filter((value) => value.trim()).length
  if (!entry.title.trim() || meaningfulFields < 2) return ''
  return JSON.stringify({
    title: normalizeReviewDuplicate(entry.title),
    organization: normalizeReviewDuplicate(entry.organization),
    location: normalizeReviewDuplicate(entry.location),
    startDate: normalizeReviewDuplicate(entry.startDate),
    endDate: normalizeReviewDuplicate(entry.endDate),
    current: entry.current,
    url: externalHref(entry.url) || normalizeReviewDuplicate(entry.url),
    summary: normalizeReviewDuplicate(entry.summary),
    highlights: entry.highlights.map(normalizeReviewDuplicate).filter(Boolean),
    keywords: entry.keywords.map(normalizeReviewDuplicate).filter(Boolean),
  })
}

export function findDuplicateEntry(resume: ResumeDocument): (DuplicateReviewLocation & { entryId: string }) | null {
  const seen = new Set<string>()
  for (const section of resume.sections.filter((item) => item.visible)) {
    for (const entry of section.entries) {
      const fingerprint = entryFingerprint(entry)
      if (!fingerprint) continue
      if (seen.has(fingerprint)) return { sectionId: section.id, entryId: entry.id }
      seen.add(fingerprint)
    }
  }
  return null
}

export function findDuplicateKeyword(resume: ResumeDocument): (DuplicateReviewLocation & { entryId: string; itemIndex: number }) | null {
  for (const section of resume.sections.filter((item) => item.visible)) {
    for (const entry of section.entries) {
      const seen = new Set<string>()
      for (let itemIndex = 0; itemIndex < entry.keywords.length; itemIndex += 1) {
        const normalized = normalizeReviewDuplicate(entry.keywords[itemIndex] ?? '')
        if (!normalized) continue
        if (seen.has(normalized)) return { sectionId: section.id, entryId: entry.id, itemIndex }
        seen.add(normalized)
      }
    }
  }
  return null
}

export function findDuplicateHighlight(resume: ResumeDocument): (DuplicateReviewLocation & { entryId: string; itemIndex: number }) | null {
  const seen = new Set<string>()
  for (const section of resume.sections.filter((item) => item.visible)) {
    for (const entry of section.entries) {
      for (let itemIndex = 0; itemIndex < entry.highlights.length; itemIndex += 1) {
        const normalized = normalizeReviewDuplicate(entry.highlights[itemIndex] ?? '')
        if (!normalized) continue
        if (seen.has(normalized)) return { sectionId: section.id, entryId: entry.id, itemIndex }
        seen.add(normalized)
      }
    }
  }
  return null
}
