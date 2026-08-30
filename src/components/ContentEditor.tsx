import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { createEntry, createId, createSection, moveInArray, SECTION_CATALOG, type ResumeDocument, type ResumeEntry, type ResumeLink, type ResumeSection, type SectionKind } from '../lib/resume'

interface ContentEditorProps {
  resume: ResumeDocument
  onChange: (resume: ResumeDocument) => void
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'url'
  wide?: boolean
  disabled?: boolean
}

function TextField({ label, value, onChange, placeholder, type = 'text', wide, disabled }: TextFieldProps) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  )
}

function TextAreaField({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string }) {
  return (
    <label className="field field-wide">
      <span>{label}</span>
      <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.currentTarget.value)} rows={4} />
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

function IconButton({ label, children, onClick, disabled, danger }: { label: string; children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button className={`icon-button ${danger ? 'danger' : ''}`} type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>
}

function StringListEditor({ label, values, onChange, placeholder, addLabel }: { label: string; values: string[]; onChange: (values: string[]) => void; placeholder: string; addLabel: string }) {
  return (
    <fieldset className="list-field">
      <legend>{label}</legend>
      {values.map((value, index) => (
        <div className="list-field-row" key={index}>
          <textarea rows={2} value={value} placeholder={placeholder} onChange={(event) => onChange(values.map((item, itemIndex) => itemIndex === index ? event.currentTarget.value : item))} />
          <IconButton label={`Remove ${label.toLocaleLowerCase()} ${index + 1}`} danger onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></IconButton>
        </div>
      ))}
      <button className="text-button compact-button" type="button" onClick={() => onChange([...values, ''])}><Plus size={14} /> {addLabel}</button>
    </fieldset>
  )
}

const entryLabels: Record<SectionKind, { title: string; organization: string; summary: string }> = {
  experience: { title: 'Role or position', organization: 'Organization', summary: 'Role overview (optional)' },
  education: { title: 'Degree, program, or training', organization: 'School or provider', summary: 'Details (optional)' },
  skills: { title: 'Skill group', organization: 'Context (optional)', summary: 'Details (optional)' },
  projects: { title: 'Project or selected work', organization: 'Client, team, or context', summary: 'Project overview' },
  certifications: { title: 'License or credential', organization: 'Issuing authority', summary: 'Scope or credential details' },
  volunteering: { title: 'Role or contribution', organization: 'Organization', summary: 'Service overview' },
  awards: { title: 'Award, grant, or honor', organization: 'Awarding organization', summary: 'Why it was awarded' },
  publications: { title: 'Title', organization: 'Publication, conference, or venue', summary: 'Citation or context' },
  languages: { title: 'Language', organization: 'Proficiency', summary: 'Additional context' },
  affiliations: { title: 'Membership or role', organization: 'Association or board', summary: 'Contribution or context' },
  interests: { title: 'Interest group', organization: 'Context (optional)', summary: 'Details (optional)' },
  custom: { title: 'Title', organization: 'Organization or context', summary: 'Details' },
}

function EntryEditor({ entry, kind, index, total, onChange, onMove, onDuplicate, onDelete }: {
  entry: ResumeEntry
  kind: SectionKind
  index: number
  total: number
  onChange: (entry: ResumeEntry) => void
  onMove: (direction: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const labels = entryLabels[kind]
  const patch = (updates: Partial<ResumeEntry>) => onChange({ ...entry, ...updates })
  const useKeywords = kind === 'skills' || kind === 'interests'
  const showHighlights = !['skills', 'languages', 'interests', 'certifications', 'awards', 'publications', 'affiliations'].includes(kind)
  return (
    <div className="entry-editor">
      <div className="entry-editor-toolbar">
        <span>Entry {index + 1}</span>
        <div>
          <IconButton label="Move entry up" disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp size={15} /></IconButton>
          <IconButton label="Move entry down" disabled={index === total - 1} onClick={() => onMove(1)}><ChevronDown size={15} /></IconButton>
          <IconButton label="Duplicate entry" onClick={onDuplicate}><Copy size={14} /></IconButton>
          <IconButton label="Delete entry" danger onClick={onDelete}><Trash2 size={14} /></IconButton>
        </div>
      </div>
      <div className="field-grid">
        <TextField label={labels.title} value={entry.title} onChange={(title) => patch({ title })} />
        <TextField label={labels.organization} value={entry.organization} onChange={(organization) => patch({ organization })} />
        {kind !== 'skills' && kind !== 'interests' ? <TextField label="Location" value={entry.location} onChange={(location) => patch({ location })} placeholder="City, region or Remote" /> : null}
        <TextField label="Link (optional)" type="url" value={entry.url} onChange={(url) => patch({ url })} placeholder="portfolio.example.com/work" />
        {kind !== 'skills' && kind !== 'interests' ? (
          <>
            <TextField label="Start" value={entry.startDate} onChange={(startDate) => patch({ startDate })} placeholder="2022 or Sep 2022" />
            <TextField label="End" value={entry.current ? 'Present' : entry.endDate} disabled={entry.current} onChange={(endDate) => patch({ endDate })} placeholder="2025" />
            <label className="check-field field-wide"><input type="checkbox" checked={entry.current} onChange={(event) => patch({ current: event.currentTarget.checked, endDate: event.currentTarget.checked ? '' : entry.endDate })} /> <span>Current or ongoing</span></label>
          </>
        ) : null}
        {kind !== 'skills' && kind !== 'interests' ? <TextAreaField label={labels.summary} value={entry.summary} onChange={(summary) => patch({ summary })} placeholder="One concise line of useful context—not a list of duties." /> : null}
      </div>
      {showHighlights ? <StringListEditor label="Highlights" values={entry.highlights} onChange={(highlights) => patch({ highlights })} placeholder="Start with your action, then add scope and outcome." addLabel="Add highlight" /> : null}
      {useKeywords || entry.keywords.length ? <StringListEditor label={useKeywords ? 'Skills or topics' : 'Keywords'} values={entry.keywords} onChange={(keywords) => patch({ keywords })} placeholder="Add one capability per item" addLabel={useKeywords ? 'Add skill' : 'Add keyword'} /> : null}
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
    <details className="section-editor" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
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
          <TextField wide label="Section heading" value={section.title} onChange={(title) => patch({ title })} />
          <IconButton label={`Delete ${section.title}`} danger onClick={onDelete}><Trash2 size={16} /></IconButton>
        </div>
        {section.entries.map((entryItem, entryIndex) => (
          <EntryEditor
            key={entryItem.id}
            entry={entryItem}
            kind={section.kind}
            index={entryIndex}
            total={section.entries.length}
            onChange={(value) => updateEntry(entryIndex, value)}
            onMove={(direction) => patch({ entries: moveInArray(section.entries, entryIndex, entryIndex + direction) })}
            onDuplicate={() => patch({ entries: [...section.entries.slice(0, entryIndex + 1), { ...entryItem, id: createId('entry') }, ...section.entries.slice(entryIndex + 1)] })}
            onDelete={() => deleteEntry(entryIndex)}
          />
        ))}
        <button className="secondary-button full-button" type="button" onClick={() => patch({ entries: [...section.entries, createEntry(section.kind)] })}><Plus size={16} /> Add {section.kind === 'experience' ? 'role' : 'entry'}</button>
      </div>
    </details>
  )
}

function LinkEditor({ link, onChange, onDelete }: { link: ResumeLink; onChange: (link: ResumeLink) => void; onDelete: () => void }) {
  return (
    <div className="link-row">
      <TextField label="Label" value={link.label} onChange={(label) => onChange({ ...link, label })} placeholder="LinkedIn" />
      <TextField label="URL" value={link.url} onChange={(url) => onChange({ ...link, url })} placeholder="linkedin.com/in/you" />
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
  return (
    <div className="editor-stack">
      <section className="editor-card" aria-labelledby="target-heading">
        <div className="card-heading"><div><span className="eyebrow">Direction</span><h2 id="target-heading">Target</h2></div><p>Keep each version focused on one opportunity.</p></div>
        <div className="field-grid">
          <TextField label="Resume name" value={resume.title} onChange={(title) => patch({ title })} placeholder="Senior operations — Acme" />
          <TextField label="Target role" value={resume.targetRole} onChange={(targetRole) => patch({ targetRole })} placeholder="Director of Operations" />
          <TextField wide label="Industry or field (optional)" value={resume.industry} onChange={(industry) => patch({ industry })} placeholder="Healthcare, education, manufacturing…" />
        </div>
      </section>

      <details className="editor-card profile-card" open>
        <summary><div><span className="eyebrow">First impression</span><h2>Profile</h2></div></summary>
        <div className="field-grid card-fields">
          <TextField label="Full name" value={resume.profile.name} onChange={(name) => patchProfile({ name })} placeholder="Your name" />
          <TextField label="Professional headline" value={resume.profile.headline} onChange={(headline) => patchProfile({ headline })} placeholder="What you do and the value you create" />
          <TextField label="Email" type="email" value={resume.profile.email} onChange={(email) => patchProfile({ email })} placeholder="you@example.com" />
          <TextField label="Phone" type="tel" value={resume.profile.phone} onChange={(phone) => patchProfile({ phone })} placeholder="+1 555 555 5555" />
          <TextField label="Location" value={resume.profile.location} onChange={(location) => patchProfile({ location })} placeholder="City, state or Remote" />
          <TextField label="Website" type="url" value={resume.profile.website} onChange={(website) => patchProfile({ website })} placeholder="yourname.com" />
          <TextAreaField label="Summary" value={resume.profile.summary} onChange={(summary) => patchProfile({ summary })} placeholder="Summarize your scope, strongest capabilities, and the outcomes you create." hint={`${resume.profile.summary.trim().split(/\s+/).filter(Boolean).length} words · aim for 35–70`} />
        </div>
        <div className="subsection-heading"><h3>Profile links</h3><span>LinkedIn, portfolio, GitHub, ORCID, or another relevant profile</span></div>
        {resume.profile.links.map((link, index) => <LinkEditor key={link.id} link={link} onChange={(value) => patchProfile({ links: resume.profile.links.map((item, itemIndex) => itemIndex === index ? value : item) })} onDelete={() => patchProfile({ links: resume.profile.links.filter((_, itemIndex) => itemIndex !== index) })} />)}
        <button className="text-button compact-button" type="button" onClick={() => patchProfile({ links: [...resume.profile.links, { id: createId('link'), label: '', url: '' }] })}><Plus size={14} /> Add profile link</button>
      </details>

      <section className="content-sections" aria-labelledby="sections-heading">
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

      <details className="add-section-card">
        <summary><Plus size={17} /> Add another section</summary>
        <div className="section-catalog">
          {SECTION_CATALOG.map((item) => (
            <button type="button" key={item.kind} onClick={() => patch({ sections: [...resume.sections, createSection(item.kind)] })}>
              <strong>{item.title}</strong><span>{item.description}</span>
            </button>
          ))}
        </div>
      </details>
    </div>
  )
}
