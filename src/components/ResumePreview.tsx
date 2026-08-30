import type { CSSProperties, ReactNode } from 'react'
import { externalHref, formatEntryDateRange, type ResumeDocument, type ResumeEntry, type ResumeSection } from '../lib/resume'

interface ResumePreviewProps {
  resume: ResumeDocument
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

export function entryNeedsFlexibleBreak(entry: ResumeEntry): boolean {
  const words = wordCount([entry.summary, ...entry.highlights, ...entry.keywords].join(' '))
  return words > 260 || entry.highlights.filter((item) => item.trim()).length > 8
}

function DateRange({ entry, kind }: { entry: ResumeEntry; kind: ResumeSection['kind'] }) {
  const value = formatEntryDateRange(entry, kind)
  return value ? <span>{value}</span> : null
}

function OptionalLink({ value, children }: { value: string; children: ReactNode }) {
  const href = externalHref(value)
  return href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{children}</a> : null
}

function ResumeEntryView({ entry, kind }: { entry: ResumeEntry; kind: ResumeSection['kind'] }) {
  const hasHeading = entry.title.trim() || entry.organization.trim()
  const isKeywordSection = kind === 'skills' || kind === 'interests'
  return (
    <div className={`document-entry document-entry-${kind}${entryNeedsFlexibleBreak(entry) ? ' document-entry-flow' : ''}`}>
      {hasHeading ? (
        <div className="document-entry-heading">
          <div>
            {entry.title.trim() ? <h3><OptionalLink value={entry.url}>{entry.title}</OptionalLink>{!entry.url ? entry.title : null}</h3> : null}
            {entry.organization.trim() ? <p className="document-organization">{entry.organization}</p> : null}
          </div>
          <div className="document-entry-meta">
            <DateRange entry={entry} kind={kind} />
            {entry.location.trim() ? <span>{entry.location}</span> : null}
          </div>
        </div>
      ) : null}
      {entry.summary.trim() ? <p className="document-entry-summary">{entry.summary}</p> : null}
      {entry.highlights.some((item) => item.trim()) ? (
        <ul>{entry.highlights.filter((item) => item.trim()).map((highlight, index) => <li key={`${entry.id}-highlight-${index}`}>{highlight}</li>)}</ul>
      ) : null}
      {entry.keywords.some((item) => item.trim()) ? (
        <p className={isKeywordSection ? 'document-keywords' : 'document-tags'}>
          {entry.keywords.filter((item) => item.trim()).map((keyword, index) => <span key={`${entry.id}-keyword-${index}`}>{keyword}</span>)}
        </p>
      ) : null}
      {!hasHeading && entry.url.trim() ? <p><OptionalLink value={entry.url}>{entry.url}</OptionalLink></p> : null}
    </div>
  )
}

function ResumeSectionView({ section }: { section: ResumeSection }) {
  return (
    <section className={`document-section document-section-${section.kind}`} aria-labelledby={`preview-${section.id}`}>
      <h2 id={`preview-${section.id}`}>{section.title || 'Untitled section'}</h2>
      <div className="document-section-content">
        {section.entries.map((entry) => <ResumeEntryView entry={entry} kind={section.kind} key={entry.id} />)}
      </div>
    </section>
  )
}

export function ResumePreview({ resume }: ResumePreviewProps) {
  const contacts = [
    resume.profile.email.trim() ? <a key="email" href={`mailto:${resume.profile.email.trim()}`}>{resume.profile.email}</a> : null,
    resume.profile.phone.trim() ? <a key="phone" href={`tel:${resume.profile.phone.replace(/[^+\d]/g, '')}`}>{resume.profile.phone}</a> : null,
    resume.profile.location.trim() ? <span key="location">{resume.profile.location}</span> : null,
    resume.profile.website.trim() ? <OptionalLink key="website" value={resume.profile.website}>{resume.profile.website}</OptionalLink> : null,
    ...resume.profile.links.filter((link) => link.url.trim()).map((link) => <OptionalLink key={link.id} value={link.url}>{link.label || link.url}</OptionalLink>),
  ].filter(Boolean)

  return (
    <article
      id="resume-document"
      className="resume-document"
      data-layout={resume.settings.layout}
      data-page-size={resume.settings.pageSize}
      data-font={resume.settings.fontPair}
      data-density={resume.settings.density}
      style={{ '--resume-accent': resume.settings.accent } as CSSProperties}
      aria-label={`Resume preview for ${resume.profile.name || 'unnamed candidate'}`}
    >
      <header className={`document-header${wordCount(resume.profile.summary) > 180 ? ' document-header-flow' : ''}`}>
        <div className="document-identity">
          <h1>{resume.profile.name || 'Your name'}</h1>
          {resume.profile.headline.trim() ? <p className="document-headline">{resume.profile.headline}</p> : null}
        </div>
        {contacts.length ? <address className="document-contact">{contacts.map((item, index) => <span key={index}>{item}</span>)}</address> : null}
        {resume.profile.summary.trim() ? <p className="document-summary">{resume.profile.summary}</p> : null}
      </header>
      <div className="document-body">
        {resume.sections.filter((section) => section.visible).map((section) => <ResumeSectionView section={section} key={section.id} />)}
      </div>
    </article>
  )
}
