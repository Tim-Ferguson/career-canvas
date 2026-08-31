import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { ENTRY_DATE_PRESENTATION, MAX_ENTRIES, MAX_LIST_ITEMS, MAX_PROFILE_LINKS, MAX_SECTIONS, MAX_TEXT, createEntry, createId, createSection, moveInArray, SECTION_CATALOG, type ResumeDocument, type ResumeEntry, type ResumeLink, type ResumeSection, type SectionKind } from '../lib/resume'

interface ContentEditorProps {
  resume: ResumeDocument
  onChange: (resume: ResumeDocument) => void
}

interface TextFieldProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'url'
  autoComplete?: string
  wide?: boolean
  disabled?: boolean
}

function TextField({ id, label, value, onChange, placeholder, type = 'text', autoComplete, wide, disabled }: TextFieldProps) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span>{label}</span>
      <input id={id} type={type} autoComplete={autoComplete} value={value} maxLength={MAX_TEXT} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  )
}

function TextAreaField({ id, label, value, onChange, placeholder, hint }: { id?: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string }) {
  return (
    <label className="field field-wide">
      <span>{label}</span>
      <textarea id={id} value={value} maxLength={MAX_TEXT} placeholder={placeholder} onChange={(event) => onChange(event.currentTarget.value)} rows={4} />
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

function IconButton({ label, children, onClick, disabled, danger }: { label: string; children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button className={`icon-button ${danger ? 'danger' : ''}`} type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>
}

function StringListEditor({ idPrefix, label, values, onChange, placeholder, addLabel }: { idPrefix?: string; label: string; values: string[]; onChange: (values: string[]) => void; placeholder: string; addLabel: string }) {
  return (
    <fieldset className="list-field">
      <legend>{label}</legend>
      {values.map((value, index) => (
        <div className="list-field-row" key={index}>
          <textarea id={idPrefix ? `${idPrefix}-${index}` : undefined} rows={2} value={value} maxLength={MAX_TEXT} placeholder={placeholder} onChange={(event) => onChange(values.map((item, itemIndex) => itemIndex === index ? event.currentTarget.value : item))} />
          <IconButton label={`Remove ${label.toLocaleLowerCase()} ${index + 1}`} danger onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></IconButton>
        </div>
      ))}
      <button className="text-button compact-button" type="button" disabled={values.length >= MAX_LIST_ITEMS} onClick={() => onChange([...values, ''])}><Plus size={14} /> {values.length >= MAX_LIST_ITEMS ? `${label} limit reached` : addLabel}</button>
    </fieldset>
  )
}

const entryLabels: Record<SectionKind, { title: string; organization: string; location: string; summary: string }> = {
  experience: { title: 'Role or position', organization: 'Organization', location: 'Location', summary: 'Role overview (optional)' },
  education: { title: 'Degree, program, or training', organization: 'School or provider', location: 'Location (optional)', summary: 'Details (optional)' },
  skills: { title: 'Skill group', organization: 'Context (optional)', location: 'Context location (optional)', summary: 'Details (optional)' },
  projects: { title: 'Project or selected work', organization: 'Client, team, or context', location: 'Location (optional)', summary: 'Project overview' },
  certifications: { title: 'License or credential', organization: 'Issuing authority', location: 'Jurisdiction or location (optional)', summary: 'Scope or credential details' },
  volunteering: { title: 'Role or contribution', organization: 'Organization', location: 'Location (optional)', summary: 'Service overview' },
  awards: { title: 'Award, grant, or honor', organization: 'Awarding organization', location: 'Location (optional)', summary: 'Why it was awarded' },
  publications: { title: 'Title', organization: 'Publication, conference, or venue', location: 'Venue location (optional)', summary: 'Citation or context' },
  languages: { title: 'Language', organization: 'Proficiency', location: 'Region or dialect (optional)', summary: 'Additional context' },
  affiliations: { title: 'Membership or role', organization: 'Association or board', location: 'Chapter or location (optional)', summary: 'Contribution or context' },
  interests: { title: 'Interest group', organization: 'Context (optional)', location: 'Location (optional)', summary: 'Details (optional)' },
  custom: { title: 'Title', organization: 'Organization or context', location: 'Location (optional)', summary: 'Details' },
}

function EntryEditor({ entry, kind, index, total, canDuplicate, onChange, onMove, onDuplicate, onDelete }: {
  entry: ResumeEntry
  kind: SectionKind
  index: number
  total: number
  canDuplicate: boolean
  onChange: (entry: ResumeEntry) => void
  onMove: (direction: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const labels = entryLabels[kind]
  const datePresentation = ENTRY_DATE_PRESENTATION[kind]
  const [metadataOpen, setMetadataOpen] = useState(() => Boolean(entry.location.trim() || entry.startDate.trim() || entry.endDate.trim() || entry.current))
  const patch = (updates: Partial<ResumeEntry>) => onChange({ ...entry, ...updates })
  const useKeywords = kind === 'skills' || kind === 'interests'
  const supportsHighlights = !['skills', 'languages', 'interests'].includes(kind)
  const showHighlightsByDefault = !['certifications', 'awards', 'publications', 'affiliations'].includes(kind)
  const metadataFields = (
    <>
      <TextField label={labels.location} value={entry.location} onChange={(location) => patch({ location })} {...(kind === 'experience' ? { placeholder: 'City, region or Remote' } : {})} />
      <TextField id={`entry-start-${entry.id}`} label={datePresentation.startLabel} value={entry.startDate} onChange={(startDate) => patch({ startDate })} placeholder={datePresentation.startPlaceholder} />
      <TextField id={`entry-end-${entry.id}`} label={datePresentation.endLabel} value={entry.current ? datePresentation.currentText : entry.endDate} disabled={entry.current} onChange={(endDate) => patch({ endDate })} placeholder={datePresentation.endPlaceholder} />
      <label className="check-field field-wide">
        <input id={`entry-current-${entry.id}`} type="checkbox" checked={entry.current} onChange={(event) => patch({ current: event.currentTarget.checked })} />
        <span>{datePresentation.currentLabel}{entry.current && entry.endDate.trim() ? <small>Your previous end value is preserved and will return if you uncheck this.</small> : null}</span>
      </label>
    </>
  )
  return (
    <div className="entry-editor" id={`entry-editor-${entry.id}`}>
      <div className="entry-editor-toolbar">
        <span>Entry {index + 1}</span>
        <div>
          <IconButton label="Move entry up" disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp size={15} /></IconButton>
          <IconButton label="Move entry down" disabled={index === total - 1} onClick={() => onMove(1)}><ChevronDown size={15} /></IconButton>
          <IconButton label="Duplicate entry" disabled={!canDuplicate} onClick={onDuplicate}><Copy size={14} /></IconButton>
          <IconButton label="Delete entry" danger onClick={onDelete}><Trash2 size={14} /></IconButton>
        </div>
      </div>
      <div className="field-grid">
        <TextField id={`entry-title-${entry.id}`} label={labels.title} value={entry.title} onChange={(title) => patch({ title })} />
        <TextField label={labels.organization} value={entry.organization} onChange={(organization) => patch({ organization })} />
        <TextField id={`entry-url-${entry.id}`} label="Link (optional)" type="url" value={entry.url} onChange={(url) => patch({ url })} placeholder="portfolio.example.com/work" />
        {!datePresentation.optional ? metadataFields : null}
        <TextAreaField label={labels.summary} value={entry.summary} onChange={(summary) => patch({ summary })} placeholder="One concise line of useful context—not a list of duties." />
      </div>
      {datePresentation.optional ? (
        <details className="entry-optional-metadata" open={metadataOpen} onToggle={(event) => setMetadataOpen(event.currentTarget.open)}>
          <summary>Optional location and dates</summary>
          <div className="field-grid">{metadataFields}</div>
        </details>
      ) : null}
      {supportsHighlights && (showHighlightsByDefault || entry.highlights.length) ? <StringListEditor idPrefix={`entry-highlight-${entry.id}`} label="Highlights" values={entry.highlights} onChange={(highlights) => patch({ highlights })} placeholder="Start with your action, then add scope and outcome." addLabel="Add highlight" /> : supportsHighlights ? <button className="text-button compact-button" type="button" onClick={() => patch({ highlights: [''] })}><Plus size={14} /> Add supporting detail</button> : null}
      {useKeywords || entry.keywords.length ? <StringListEditor idPrefix={`entry-keyword-${entry.id}`} label={useKeywords ? 'Skills or topics' : 'Keywords'} values={entry.keywords} onChange={(keywords) => patch({ keywords })} placeholder="Add one capability per item" addLabel={useKeywords ? 'Add skill' : 'Add keyword'} /> : <button className="text-button compact-button" type="button" onClick={() => patch({ keywords: [''] })}><Plus size={14} /> Add optional keywords</button>}
    </div>
  )
}

function SectionEditor({ section, index, total, onChange, onMove, onDelete }: {
  section: ResumeSection
  index: number
  total: number
  onChange: (section: ResumeSection) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}) {
  const [isOpen, setIsOpen] = useState(index < 2)
  const patch = (updates: Partial<ResumeSection>) => onChange({ ...section, ...updates })
  const updateEntry = (entryIndex: number, value: ResumeEntry) => patch({ entries: section.entries.map((entry, indexItem) => indexItem === entryIndex ? value : entry) })
  const deleteEntry = (entryIndex: number) => {
    const target = section.entries[entryIndex]
    if (target && (target.title.trim() || target.highlights.some((item) => item.trim())) && !window.confirm('Delete this entry and its content?')) return
    patch({ entries: section.entries.filter((_, indexItem) => indexItem !== entryIndex) })
  }
  return (
    <details className="section-editor" id={`section-editor-${section.id}`} open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        <span className="section-summary-text"><strong>{section.title || 'Untitled section'}</strong><small>{section.visible ? `${section.entries.length} ${section.entries.length === 1 ? 'entry' : 'entries'}` : 'Hidden from resume'}</small></span>
        <span className="section-summary-actions" onClick={(event) => event.preventDefault()}>
          <IconButton label={section.visible ? `Hide ${section.title}` : `Show ${section.title}`} onClick={() => patch({ visible: !section.visible })}>{section.visible ? <Eye size={15} /> : <EyeOff size={15} />}</IconButton>
          <IconButton label={`Move ${section.title} up`} disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp size={15} /></IconButton>
          <IconButton label={`Move ${section.title} down`} disabled={index === total - 1} onClick={() => onMove(1)}><ChevronDown size={15} /></IconButton>
        </span>
      </summary>
      <div className="section-editor-body">
        <div className="section-title-row">
          <TextField id={`section-title-${section.id}`} wide label="Section heading" value={section.title} onChange={(title) => patch({ title })} />
          <IconButton label={`Delete ${section.title}`} danger onClick={onDelete}><Trash2 size={16} /></IconButton>
        </div>
        {section.entries.map((entryItem, entryIndex) => (
          <EntryEditor
            key={entryItem.id}
            entry={entryItem}
            kind={section.kind}
            index={entryIndex}
            total={section.entries.length}
            canDuplicate={section.entries.length < MAX_ENTRIES}
            onChange={(value) => updateEntry(entryIndex, value)}
            onMove={(direction) => patch({ entries: moveInArray(section.entries, entryIndex, entryIndex + direction) })}
            onDuplicate={() => patch({ entries: [...section.entries.slice(0, entryIndex + 1), { ...entryItem, id: createId('entry') }, ...section.entries.slice(entryIndex + 1)] })}
            onDelete={() => deleteEntry(entryIndex)}
          />
        ))}
        <button className="secondary-button full-button" type="button" disabled={section.entries.length >= MAX_ENTRIES} onClick={() => patch({ entries: [...section.entries, createEntry(section.kind)] })}><Plus size={16} /> {section.entries.length >= MAX_ENTRIES ? 'Entry limit reached' : `Add ${section.kind === 'experience' ? 'role' : 'entry'}`}</button>
      </div>
    </details>
  )
}

function LinkEditor({ link, onChange, onDelete }: { link: ResumeLink; onChange: (link: ResumeLink) => void; onDelete: () => void }) {
  return (
    <div className="link-row">
      <TextField id={`profile-link-label-${link.id}`} label="Label" value={link.label} onChange={(label) => onChange({ ...link, label })} placeholder="LinkedIn" />
      <TextField id={`profile-link-url-${link.id}`} label="URL" type="url" value={link.url} onChange={(url) => onChange({ ...link, url })} placeholder="linkedin.com/in/you" />
      <IconButton label="Remove profile link" danger onClick={onDelete}><Trash2 size={15} /></IconButton>
    </div>
  )
}

export function ContentEditor({ resume, onChange }: ContentEditorProps) {
  const patch = (updates: Partial<ResumeDocument>) => onChange({ ...resume, ...updates })
  const patchProfile = (updates: Partial<ResumeDocument['profile']>) => patch({ profile: { ...resume.profile, ...updates } })
  const updateSection = (index: number, value: ResumeSection) => patch({ sections: resume.sections.map((sectionItem, sectionIndex) => sectionIndex === index ? value : sectionItem) })
  const deleteSection = (index: number) => {
    const target = resume.sections[index]
    if (!target) return
    const hasContent = target.entries.some((entryItem) => entryItem.title.trim() || entryItem.highlights.some((item) => item.trim()))
    if (hasContent && !window.confirm(`Delete ${target.title} and all of its entries?`)) return
    patch({ sections: resume.sections.filter((_, sectionIndex) => sectionIndex !== index) })
  }
  const setAllSectionsOpen = (open: boolean) => {
    document.querySelectorAll<HTMLDetailsElement>('#content-sections > .section-editor').forEach((element) => { element.open = open })
  }
  const openSectionEditor = (sectionId: string) => {
    const element = document.getElementById(`section-editor-${sectionId}`)
    if (!(element instanceof HTMLDetailsElement)) return
    element.open = true
    window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      element.querySelector<HTMLElement>(':scope > summary')?.focus({ preventScroll: true })
    })
  }
  const visibleSections = resume.sections.filter((section) => section.visible).length
  return (
    <div className="editor-stack">
      <section className="editor-card" aria-labelledby="target-heading">
        <div className="card-heading"><div><span className="eyebrow">Direction</span><h2 id="target-heading">Target</h2></div><p>Keep each version focused on one opportunity.</p></div>
        <div className="field-grid">
          <TextField id="resume-title" label="Resume name" value={resume.title} onChange={(title) => patch({ title })} placeholder="Senior operations — Acme" />
          <TextField id="resume-target-role" label="Target role" value={resume.targetRole} onChange={(targetRole) => patch({ targetRole })} placeholder="Director of Operations" />
          <TextField wide label="Industry or field (optional)" value={resume.industry} onChange={(industry) => patch({ industry })} placeholder="Healthcare, education, manufacturing…" />
        </div>
      </section>

      <details className="editor-card profile-card" id="profile-editor" open>
        <summary><div><span className="eyebrow">First impression</span><h2>Profile</h2></div></summary>
        <div className="field-grid card-fields">
          <TextField id="profile-name" label="Full name" autoComplete="name" value={resume.profile.name} onChange={(name) => patchProfile({ name })} placeholder="Your name" />
          <TextField label="Professional headline" value={resume.profile.headline} onChange={(headline) => patchProfile({ headline })} placeholder="What you do and the value you create" />
          <TextField id="profile-email" label="Email" type="email" autoComplete="email" value={resume.profile.email} onChange={(email) => patchProfile({ email })} placeholder="you@example.com" />
          <TextField id="profile-phone" label="Phone" type="tel" autoComplete="tel" value={resume.profile.phone} onChange={(phone) => patchProfile({ phone })} placeholder="+1 555 555 5555" />
          <TextField label="Location" autoComplete="address-level2" value={resume.profile.location} onChange={(location) => patchProfile({ location })} placeholder="City, state or Remote" />
          <TextField id="profile-website" label="Website" type="url" autoComplete="url" value={resume.profile.website} onChange={(website) => patchProfile({ website })} placeholder="yourname.com" />
          <TextAreaField id="profile-summary" label="Summary" value={resume.profile.summary} onChange={(summary) => patchProfile({ summary })} placeholder="Summarize your scope, strongest capabilities, and the outcomes you create." hint={`${resume.profile.summary.trim().split(/\s+/).filter(Boolean).length} words · aim for 35–70`} />
        </div>
        <div className="subsection-heading"><h3>Profile links</h3><span>LinkedIn, portfolio, GitHub, ORCID, or another relevant profile</span></div>
        {resume.profile.links.map((link, index) => <LinkEditor key={link.id} link={link} onChange={(value) => patchProfile({ links: resume.profile.links.map((item, itemIndex) => itemIndex === index ? value : item) })} onDelete={() => patchProfile({ links: resume.profile.links.filter((_, itemIndex) => itemIndex !== index) })} />)}
        <button className="text-button compact-button" type="button" disabled={resume.profile.links.length >= MAX_PROFILE_LINKS} onClick={() => patchProfile({ links: [...resume.profile.links, { id: createId('link'), label: '', url: '' }] })}><Plus size={14} /> {resume.profile.links.length >= MAX_PROFILE_LINKS ? 'Profile link limit reached' : 'Add profile link'}</button>
      </details>

      {resume.sections.length ? (
        <details className="editor-card resume-outline">
          <summary>
            <div><span className="eyebrow">Navigate</span><h2>Resume outline</h2></div>
            <small>{resume.sections.length} {resume.sections.length === 1 ? 'section' : 'sections'} · {visibleSections} shown</small>
          </summary>
          <div className="resume-outline-body">
            <div className="resume-outline-actions"><button type="button" onClick={() => setAllSectionsOpen(true)}>Expand all editors</button><button type="button" onClick={() => setAllSectionsOpen(false)}>Collapse all editors</button></div>
            <nav className="resume-outline-list" aria-label="Resume sections">
              {resume.sections.map((section, index) => (
                <button type="button" className={section.visible ? '' : 'hidden-section'} key={section.id} onClick={() => openSectionEditor(section.id)}>
                  <span>{index + 1}</span><strong>{section.title || 'Untitled section'}</strong><small>{SECTION_CATALOG.find((item) => item.kind === section.kind)?.title || section.kind} · {section.entries.length} {section.entries.length === 1 ? 'entry' : 'entries'}{section.visible ? '' : ' · Hidden'}</small>
                </button>
              ))}
            </nav>
          </div>
        </details>
      ) : null}

      <section className="content-sections" id="content-sections" aria-labelledby="sections-heading">
        <div className="card-heading section-list-heading"><div><span className="eyebrow">Your evidence</span><h2 id="sections-heading">Sections</h2></div><p>Order them by relevance for this target.</p></div>
        {resume.sections.map((sectionItem, index) => (
          <SectionEditor
            key={sectionItem.id}
            section={sectionItem}
            index={index}
            total={resume.sections.length}
            onChange={(value) => updateSection(index, value)}
            onMove={(direction) => patch({ sections: moveInArray(resume.sections, index, index + direction) })}
            onDelete={() => deleteSection(index)}
          />
        ))}
      </section>

      <details className="add-section-card" id="add-section-control">
        <summary><Plus size={17} /> Add another section</summary>
        <div className="section-catalog">
          {SECTION_CATALOG.map((item) => (
            <button type="button" key={item.kind} disabled={resume.sections.length >= MAX_SECTIONS} onClick={() => patch({ sections: [...resume.sections, createSection(item.kind)] })}>
              <strong>{item.title}</strong><span>{item.description}</span>
            </button>
          ))}
        </div>
        {resume.sections.length >= MAX_SECTIONS ? <p className="card-note">The {MAX_SECTIONS}-section document limit is reached. Reuse, rename, or remove a section before adding another.</p> : null}
      </details>
    </div>
  )
}
