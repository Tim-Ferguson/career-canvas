import type { CSSProperties, ReactNode } from 'react'
import { entryHasRenderableContent, formatEntryDateRange, sectionHasRenderableContent, type ResumeDocument, type ResumeEntry, type ResumeSection } from '../lib/resume'
import { emailHref, externalHref, phoneHref } from '../lib/contactLinks'

interface ResumePreviewProps {
  resume: ResumeDocument
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function contentNeedsFlexibleBreak(values: string[], wordLimit: number, characterLimit: number): boolean {
  const content = values.join(' ')
  return wordCount(content) > wordLimit || content.length > characterLimit
}

export function entryNeedsFlexibleBreak(entry: ResumeEntry): boolean {
  return contentNeedsFlexibleBreak([entry.title, entry.organization, entry.location, entry.startDate, entry.endDate, entry.url, entry.summary, ...entry.highlights, ...entry.keywords], 260, 2_600) || entry.highlights.filter((item) => item.trim()).length > 8
}

export function textBlockNeedsFlexibleBreak(value: string): boolean {
  return wordCount(value) > 220 || value.length > 1_800
}

export function keywordListNeedsFlexibleBreak(values: string[]): boolean {
  return values.filter((value) => value.trim()).length > 32 || contentNeedsFlexibleBreak(values, 260, 2_000)
}

function DateRange({ entry, kind }: { entry: ResumeEntry; kind: ResumeSection['kind'] }) {
  const value = formatEntryDateRange(entry, kind)
  return value ? <span>{value}</span> : null
}

function OptionalLink({ value, children }: { value: string; children: ReactNode }) {
  const href = externalHref(value)
  return href ? <a href={href} target="_blank" rel="noreferrer">{children}</a> : <>{children}</>
}

function ContactLink({ href, children }: { href: string; children: ReactNode }) {
  return href ? <a href={href}>{children}</a> : <>{children}</>
}

function ResumeEntryView({ entry, kind }: { entry: ResumeEntry; kind: ResumeSection['kind'] }) {
  const hasHeading = entry.title.trim() || entry.organization.trim()
  const hasMeta = entry.location.trim() || formatEntryDateRange(entry, kind)
  const isKeywordSection = kind === 'skills' || kind === 'interests'
  const headingFlows = contentNeedsFlexibleBreak([entry.title, entry.organization, entry.location, entry.startDate, entry.endDate], 120, 1_200)
  const keywordsFlow = keywordListNeedsFlexibleBreak(entry.keywords)
  return (
    <div className={`document-entry document-entry-${kind}${entryNeedsFlexibleBreak(entry) ? ' document-entry-flow' : ''}`}>
      {hasHeading ? (
        <div className={`document-entry-heading${headingFlows ? ' document-entry-heading-flow' : ''}`}>
          <div>
            {entry.title.trim() ? <h3><OptionalLink value={entry.url}>{entry.title}</OptionalLink></h3> : null}
            {entry.organization.trim() ? <p className="document-organization">{entry.organization}</p> : null}
          </div>
          <div className="document-entry-meta">
            <DateRange entry={entry} kind={kind} />
            {entry.location.trim() ? <span>{entry.location}</span> : null}
          </div>
        </div>
      ) : hasMeta ? <div className="document-entry-meta document-entry-meta-standalone"><DateRange entry={entry} kind={kind} />{entry.location.trim() ? <span>{entry.location}</span> : null}</div> : null}
      {entry.summary.trim() ? <p className="document-entry-summary">{entry.summary}</p> : null}
      {entry.highlights.some((item) => item.trim()) ? (
        <ul>{entry.highlights.filter((item) => item.trim()).map((highlight, index) => <li className={textBlockNeedsFlexibleBreak(highlight) ? 'document-highlight-flow' : undefined} key={`${entry.id}-highlight-${index}`}>{highlight}</li>)}</ul>
      ) : null}
      {entry.keywords.some((item) => item.trim()) ? (
        <p className={`${isKeywordSection ? 'document-keywords' : 'document-tags'}${keywordsFlow ? ' document-keyword-list-flow' : ''}`}>
          {entry.keywords.filter((item) => item.trim()).map((keyword, index) => <span key={`${entry.id}-keyword-${index}`}>{keyword}</span>)}
        </p>
      ) : null}
      {!hasHeading && entry.url.trim() ? <p><OptionalLink value={entry.url}>{entry.url}</OptionalLink></p> : null}
    </div>
  )
}

function ResumeSectionView({ section }: { section: ResumeSection }) {
  const entries = section.entries.filter(entryHasRenderableContent)
  return (
    <section className={`document-section document-section-${section.kind}`} aria-labelledby={`preview-${section.id}`}>
      <h2 id={`preview-${section.id}`}>{section.title || 'Untitled section'}</h2>
      <div className="document-section-content">
        {entries.map((entry) => <ResumeEntryView entry={entry} kind={section.kind} key={entry.id} />)}
      </div>
    </section>
  )
}

export function ResumePreview({ resume }: ResumePreviewProps) {
  const contactText = [resume.profile.email, resume.profile.phone, resume.profile.location, resume.profile.website, ...resume.profile.links.flatMap((link) => [link.label, link.url])]
  const identityFlows = contentNeedsFlexibleBreak([resume.profile.name, resume.profile.headline], 120, 1_200)
  const contactsFlow = resume.profile.links.filter((link) => link.url.trim()).length > 12 || contentNeedsFlexibleBreak(contactText, 180, 1_800)
  const headerFlows = identityFlows || contactsFlow || contentNeedsFlexibleBreak([resume.profile.summary], 180, 1_800)
  const contacts = [
    resume.profile.email.trim() ? <ContactLink key="email" href={emailHref(resume.profile.email)}>{resume.profile.email}</ContactLink> : null,
    resume.profile.phone.trim() ? <ContactLink key="phone" href={phoneHref(resume.profile.phone)}>{resume.profile.phone}</ContactLink> : null,
    resume.profile.location.trim() ? <span key="location">{resume.profile.location}</span> : null,
    resume.profile.website.trim() ? <OptionalLink key="website" value={resume.profile.website}>{resume.profile.website}</OptionalLink> : null,
    ...resume.profile.links.filter((link) => link.url.trim()).map((link) => <OptionalLink key={link.id} value={link.url}>{link.label || link.url}</OptionalLink>),
  ].filter(Boolean)
  const hasIdentity = Boolean(resume.profile.name.trim() || resume.profile.headline.trim())
  const hasHeader = Boolean(hasIdentity || contacts.length || resume.profile.summary.trim())

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
      {hasHeader ? (
        <header className={`document-header${headerFlows ? ' document-header-flow' : ''}`}>
          {hasIdentity ? <div className={`document-identity${identityFlows ? ' document-identity-flow' : ''}`}>{resume.profile.name.trim() ? <h1>{resume.profile.name}</h1> : null}{resume.profile.headline.trim() ? <p className="document-headline">{resume.profile.headline}</p> : null}</div> : null}
          {contacts.length ? <address className={`document-contact${contactsFlow ? ' document-contact-flow' : ''}`}>{contacts.map((item, index) => <span key={index}>{item}</span>)}</address> : null}
          {resume.profile.summary.trim() ? <p className="document-summary">{resume.profile.summary}</p> : null}
        </header>
      ) : null}
      <div className="document-body">
        {resume.sections.filter((section) => section.visible && sectionHasRenderableContent(section)).map((section) => <ResumeSectionView section={section} key={section.id} />)}
      </div>
    </article>
  )
}
