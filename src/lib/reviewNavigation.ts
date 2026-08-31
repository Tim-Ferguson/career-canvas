import { duplicateExternalLinkIndex, externalHref } from './contactLinks'
import type { ResumeDocument, ResumeIssue } from './resume'

export interface ReviewDestination {
  id: string
  label: string
}

function words(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function invalidLink(value: string): boolean {
  return Boolean(value.trim()) && !externalHref(value)
}

export function reviewDestination(issue: ResumeIssue, resume: ResumeDocument): ReviewDestination {
  const visibleSections = resume.sections.filter((section) => section.visible)
  const visibleEntries = visibleSections.flatMap((section) => section.entries)
  const highlights = visibleEntries.flatMap((entry) => entry.highlights.map((highlight, index) => ({ entry, highlight, index }))).filter((item) => item.highlight.trim())
  const section = issue.sectionId ? resume.sections.find((item) => item.id === issue.sectionId) : undefined
  const destination = (id: string) => ({ id, label: issue.title })

  if (issue.id === 'name') return destination('profile-name')
  if (issue.id === 'contact' || issue.id === 'email-format') return destination('profile-email')
  if (issue.id === 'phone-format') return destination('profile-phone')
  if (issue.id === 'target') return destination('resume-target-role')
  if (issue.id === 'sample-content') return destination('profile-name')
  if (issue.id.startsWith('summary-')) return destination('profile-summary')
  if (issue.id.startsWith('section-title-') && section) return destination(`section-title-${section.id}`)
  if (issue.id.startsWith('empty-') && section) return destination(`section-editor-${section.id}`)
  if (issue.id.startsWith('missing-entry-title-') && section) {
    const entry = section.entries.find((item) => !item.title.trim() && (item.organization.trim() || item.summary.trim() || item.highlights.some((highlight) => highlight.trim())))
    return destination(entry ? `entry-title-${entry.id}` : `section-editor-${section.id}`)
  }
  if (issue.id.startsWith('too-many-bullets-') && section) {
    const entry = section.entries.find((item) => item.highlights.filter((highlight) => highlight.trim()).length > 7)
    return destination(entry ? `entry-editor-${entry.id}` : `section-editor-${section.id}`)
  }
  if (issue.id === 'evidence') {
    const experience = resume.sections.find((item) => item.kind === 'experience')
    return destination(experience ? `section-editor-${experience.id}` : 'add-section-control')
  }
  if (issue.id === 'experience-dates') {
    const entry = issue.entryId ? visibleEntries.find((item) => item.id === issue.entryId) : visibleSections.filter((item) => item.kind === 'experience').flatMap((item) => item.entries).find((item) => item.title.trim() && (!item.startDate.trim() || (!item.current && !item.endDate.trim())))
    return destination(entry ? `${entry.startDate.trim() ? 'entry-end' : 'entry-start'}-${entry.id}` : 'content-sections')
  }
  if (issue.id === 'reversed-date-range') return destination(issue.entryId ? `entry-end-${issue.entryId}` : 'content-sections')
  if (issue.id === 'future-current-entry') return destination(issue.entryId ? `entry-start-${issue.entryId}` : 'content-sections')
  if (issue.id === 'current-status-mismatch') return destination(issue.entryId ? `entry-current-${issue.entryId}` : 'content-sections')
  if (issue.id === 'few-bullets') {
    const experience = visibleSections.find((item) => item.kind === 'experience')
    return destination(experience ? `section-editor-${experience.id}` : 'content-sections')
  }
  if (issue.id === 'outcomes') {
    const item = highlights[0]
    return destination(item ? `entry-highlight-${item.entry.id}-${item.index}` : 'content-sections')
  }
  if (issue.id === 'long-bullets') {
    const item = highlights.find((candidate) => words(candidate.highlight) > 35)
    return destination(item ? `entry-highlight-${item.entry.id}-${item.index}` : 'content-sections')
  }
  if (issue.id === 'duplicate-bullets') {
    const seen = new Set<string>()
    const item = highlights.find((candidate) => {
      const normalized = candidate.highlight.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      if (seen.has(normalized)) return true
      seen.add(normalized)
      return false
    })
    return destination(item ? `entry-highlight-${item.entry.id}-${item.index}` : 'content-sections')
  }
  if (issue.id === 'weak-bullets') {
    const item = highlights.find((candidate) => /^(responsible for|duties included|helped (with|to)|worked on)\b/i.test(candidate.highlight.trim()))
    return destination(item ? `entry-highlight-${item.entry.id}-${item.index}` : 'content-sections')
  }
  if (issue.id === 'first-person-bullets') {
    const item = highlights.find((candidate) => /\b(i|me|my|we|our)\b/i.test(candidate.highlight))
    return destination(item ? `entry-highlight-${item.entry.id}-${item.index}` : 'content-sections')
  }
  if (issue.id === 'verbs') {
    const item = highlights[0]
    return destination(item ? `entry-highlight-${item.entry.id}-${item.index}` : 'content-sections')
  }
  if (issue.id === 'links') {
    if (invalidLink(resume.profile.website)) return destination('profile-website')
    const profileLink = resume.profile.links.find((link) => invalidLink(link.url))
    if (profileLink) return destination(`profile-link-url-${profileLink.id}`)
    const entry = visibleEntries.find((item) => invalidLink(item.url))
    if (entry) return destination(`entry-url-${entry.id}`)
  }
  if (issue.id === 'unlabeled-profile-link') {
    const profileLink = resume.profile.links.find((link) => externalHref(link.url) && !link.label.trim())
    if (profileLink) return destination(`profile-link-label-${profileLink.id}`)
  }
  if (issue.id === 'duplicate-links') {
    const candidates = [
      { value: resume.profile.website, id: 'profile-website' },
      ...resume.profile.links.map((link) => ({ value: link.url, id: `profile-link-url-${link.id}` })),
      ...visibleEntries.map((entry) => ({ value: entry.url, id: `entry-url-${entry.id}` })),
    ].filter((candidate) => candidate.value.trim())
    const duplicateIndex = duplicateExternalLinkIndex(candidates.map((candidate) => candidate.value))
    if (duplicateIndex >= 0) return destination(candidates[duplicateIndex]!.id)
  }
  if (issue.id === 'duplicate-section-title') return destination(issue.sectionId ? `section-title-${issue.sectionId}` : 'content-sections')
  if (issue.id === 'duplicate-entry') return destination(issue.entryId ? `entry-title-${issue.entryId}` : 'content-sections')
  if (issue.id === 'duplicate-keyword') return destination(issue.entryId !== undefined && issue.itemIndex !== undefined ? `entry-keyword-${issue.entryId}-${issue.itemIndex}` : 'content-sections')
  return destination(section ? `section-editor-${section.id}` : 'content-sections')
}
